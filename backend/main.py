from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Dict, Any
import httpx
from agents import research_agent, planner_agent, critic_agent, mentor_agent
from db import (
    init_db, save_history, get_all_history_summaries, get_history_by_id, 
    create_workspace, get_workspace, update_workspace_research, 
    toggle_save_workspace, get_user_settings, update_user_settings,
    save_mentor_chat, get_telegram_link_by_workspace_id, get_workspace_by_idea
)
import os
import uuid
import logging
import threading

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Telegram Bot — runs in a background thread alongside FastAPI
# ---------------------------------------------------------------------------
def _run_telegram_bot():
    """Starts the Telegram bot polling in its own thread + event loop."""
    import asyncio
    from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters
    from bot.handlers.start import start_handler
    from bot.handlers.status import status_handler
    from bot.handlers.done import done_handler
    from bot.handlers.question import question_handler
    from bot.scheduler import start_scheduler
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    if not token or token == "your_telegram_bot_token":
        logger.warning("TELEGRAM_BOT_TOKEN not set — Telegram bot will NOT start.")
        return

    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        app = ApplicationBuilder().token(token).build()
        app.add_handler(CommandHandler("start", start_handler))
        app.add_handler(CommandHandler("status", status_handler))
        app.add_handler(CommandHandler("done", done_handler))
        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, question_handler))

        async def _start_bot():
            await app.initialize()
            start_scheduler(app)
            await app.start()
            await app.updater.start_polling()
            logger.info("Telegram Bot is now polling!")

        loop.run_until_complete(_start_bot())
        logger.info("Telegram Bot started (polling mode, background thread)...")
        loop.run_forever()
    except Exception as e:
        logger.error(f"Telegram bot crashed: {e}")

# ---------------------------------------------------------------------------
# FastAPI Lifespan — initializes DB + launches Telegram bot thread
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app):
    # --- Startup ---
    init_db()
    logger.info("Database initialized on startup")

    bot_thread = threading.Thread(target=_run_telegram_bot, daemon=True)
    bot_thread.start()
    logger.info("Telegram bot thread launched")

    yield  # App is running

    # --- Shutdown ---
    logger.info("Shutting down...")

app = FastAPI(
    title="Insights Copilot API",
    description="FastAPI backend for Insights Copilot four-agent architecture",
    version="2.0.0",
    lifespan=lifespan
)

# Global Exception Handler to catch all uncaught exceptions
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"message": "An internal server error occurred.", "details": str(exc)}
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IdeaRequest(BaseModel):
    idea: str

class MentorRequest(BaseModel):
    idea: str
    research: dict
    plan: dict
    question: str
    workspace_id: str = None

class SettingsUpdate(BaseModel):
    theme: str

security = HTTPBearer()

def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    try:
        from db import get_supabase
        supabase = get_supabase()
        res = supabase.auth.get_user(token)
        if not res or not res.user:
            raise HTTPException(status_code=401, detail="Invalid token or session expired.")
        return str(res.user.id)
    except Exception as e:
        logger.error(f"JWT Verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid authorization token.")

@app.get("/api/health")
def health_check():
    key = os.getenv("GROQ_API_KEY", "").strip()
    is_configured = bool(key and key != "your_key_here")
    return {
        "status": "ok",
        "groq_configured": is_configured
    }

@app.post("/api/analyze")
async def analyze(payload: IdeaRequest, user_id: str = Depends(get_current_user_id)):
    if not payload.idea or not payload.idea.strip():
        raise HTTPException(status_code=400, detail="The 'idea' field cannot be empty.")
    
    idea = payload.idea.strip()
    
    # Check if a workspace already exists for this user + idea (case-insensitive, trimmed)
    existing_ws = get_workspace_by_idea(idea, user_id)
    if existing_ws:
        logger.info(f"Workspace already exists for idea '{idea}'. Loading cached result.")
        return {
            "workspace_id": existing_ws["id"],
            "research": existing_ws["research"],
            "plan": existing_ws["plan"],
            "critique": existing_ws.get("critique", {}),
            "is_saved": existing_ws.get("is_saved", False)
        }
    
    # 1. Research Agent
    research = await research_agent(idea)
    
    # 2. Planner Agent
    plan = await planner_agent(idea, research)
    
    # 3. Critic Agent
    critique = await critic_agent(idea, research, plan)
    
    workspace_id = str(uuid.uuid4())
    try:
        create_workspace(
            workspace_id=workspace_id, 
            idea=idea, 
            research=research, 
            plan=plan, 
            user_id=user_id,
            critique=critique
        )
    except Exception as e:
        logger.error(f"Failed to create workspace: {e}")

    result = {
        "workspace_id": workspace_id,
        "research": research,
        "plan": plan,
        "critique": critique
    }
    # Passively save to history — never fail the request if this errors
    try:
        save_history(idea=idea, result=result, user_id=user_id)
    except Exception as e:
        logger.error(f"Failed to save history: {e}")
    return result

@app.get("/api/workspaces/{workspace_id}/telegram-link")
def get_telegram_link_endpoint(workspace_id: str, user_id: str = Depends(get_current_user_id)):
    workspace = get_workspace(workspace_id, user_id=user_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found or unauthorized")
    bot_username = os.getenv("TELEGRAM_BOT_USERNAME", "insights_copilot_bot")
    return {"deep_link": f"https://t.me/{bot_username}?start={workspace_id}"}

@app.get("/api/workspaces")
def get_workspaces_endpoint(user_id: str = Depends(get_current_user_id)):
    try:
        from db import get_supabase
        supabase = get_supabase()
        res = supabase.table("workspaces").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        workspaces_data = []
        for row in (res.data or []):
            ws_id = row["id"]
            link = get_telegram_link_by_workspace_id(ws_id)
            current_idx = link["current_milestone_index"] if link else 0
            
            # Fetch latest mentor Q&A
            try:
                mentor_res = supabase.table("mentor_chats").select("question, answer").eq("workspace_id", ws_id).order("created_at", desc=True).limit(1).execute()
                latest_mentor = mentor_res.data[0] if mentor_res.data else None
            except Exception as e:
                logger.warning(f"Could not fetch mentor chats for workspace {ws_id}: {e}")
                latest_mentor = None
            
            plan_json = row.get("plan_json") or {}
            roadmap = plan_json.get("roadmap", [])
            total_milestones = len(roadmap)
            
            if current_idx < total_milestones:
                next_step = roadmap[current_idx].get("milestone", f"Milestone {current_idx + 1}")
            else:
                next_step = "All milestones completed!"
                
            workspaces_data.append({
                "id": ws_id,
                "idea": row["idea"],
                "created_at": row["created_at"],
                "is_saved": row.get("is_saved", False),
                "milestone_progress": f"Milestone {current_idx} of {total_milestones}",
                "current_milestone_index": current_idx,
                "total_milestones": total_milestones,
                "next_step_title": next_step,
                "telegram_linked": bool(link),
                "latest_mentor": latest_mentor
            })
        return workspaces_data
    except Exception as e:
        logger.error(f"Failed to fetch workspaces list: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
def get_history(saved: bool = False, user_id: str = Depends(get_current_user_id)):
    return get_all_history_summaries(user_id=user_id, saved_only=saved)

@app.get("/api/history/{history_id}")
def get_history_item(history_id: str, user_id: str = Depends(get_current_user_id)):
    if history_id.isdigit():
        item = get_history_by_id(int(history_id), user_id)
        if not item:
            raise HTTPException(status_code=404, detail="History item not found or unauthorized")
        return item
    else:
        # It's a workspace UUID
        workspace = get_workspace(workspace_id=history_id, user_id=user_id)
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found or unauthorized")
        return {
            "workspace_id": workspace["id"],
            "research": workspace["research"],
            "plan": workspace["plan"],
            "is_saved": workspace.get("is_saved", False),
            "critique": workspace.get("critique", {})
        }

@app.patch("/api/workspaces/{workspace_id}/save")
def toggle_save(workspace_id: str, user_id: str = Depends(get_current_user_id)):
    try:
        res = toggle_save_workspace(workspace_id=workspace_id, user_id=user_id)
        return {"workspace_id": workspace_id, "is_saved": res.get("is_saved", False)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/settings")
def get_settings(user_id: str = Depends(get_current_user_id)):
    return get_user_settings(user_id)

@app.put("/api/settings")
def update_settings(payload: SettingsUpdate, user_id: str = Depends(get_current_user_id)):
    if payload.theme not in ["light", "dark"]:
        raise HTTPException(status_code=400, detail="Theme must be 'light' or 'dark'")
    return update_user_settings(user_id, payload.theme)

@app.post("/api/workspaces/{workspace_id}/refresh")
async def refresh_workspace(workspace_id: str, user_id: str = Depends(get_current_user_id)):
    workspace = get_workspace(workspace_id, user_id=user_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found or unauthorized")
        
    old_research = workspace.get("research") or {}
    previous_fetched_at = old_research.get("fetched_at", "Unknown")
    
    try:
        new_research = await research_agent(workspace["idea"])
        
        # Diff sources
        def compute_new_urls(old_list, new_list):
            old_urls = {s.get("url") for s in old_list if s.get("url")}
            return [s for s in new_list if s.get("url") and s.get("url") not in old_urls]

        new_web = compute_new_urls(old_research.get("sources", []), new_research.get("sources", []))
        new_github = compute_new_urls(old_research.get("github_repos", []), new_research.get("github_repos", []))
        new_apis = compute_new_urls(old_research.get("apis_datasets", []), new_research.get("apis_datasets", []))
        
        new_sources_combined = new_web + new_github + new_apis
        
        update_workspace_research(workspace_id, new_research, user_id=user_id)
        
        return {
            "research": new_research,
            "new_source_count": len(new_sources_combined),
            "new_sources": new_sources_combined,
            "previous_fetched_at": previous_fetched_at
        }
    except Exception as e:
        logger.error(f"Failed to refresh workspace: {e}")
        raise HTTPException(status_code=500, detail="Failed to run research refresh")

@app.post("/api/mentor")
async def mentor(payload: MentorRequest, user_id: str = Depends(get_current_user_id)):
    if not payload.question or not payload.question.strip():
        raise HTTPException(status_code=400, detail="The 'question' field cannot be empty.")
        
    res = await mentor_agent(
        idea=payload.idea, 
        research=payload.research, 
        plan=payload.plan, 
        question=payload.question
    )
    
    # Save the exchange to mentor_chats if workspace_id is provided
    if payload.workspace_id:
        try:
            save_mentor_chat(
                workspace_id=payload.workspace_id,
                question=payload.question,
                answer=res.get("answer", ""),
                user_id=user_id
            )
        except Exception as e:
            logger.error(f"Failed to save mentor chat: {e}")
            
    return res
