from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Dict, Any
import httpx
from agents import research_agent, planner_agent, critic_agent, mentor_agent, generate_founder_insight
from db import (
    init_db, save_history, get_all_history_summaries, get_history_by_id, 
    create_workspace, get_workspace, update_workspace_research, 
    toggle_save_workspace, get_user_settings, update_user_settings,
    save_mentor_chat, get_telegram_link_by_workspace_id, get_workspace_by_idea,
    update_workspace_chat_history, delete_workspace
)
import os
import uuid
import logging
import json
import asyncio

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Telegram Bot — integrates with FastAPI's event loop
# ---------------------------------------------------------------------------
async def _init_telegram_bot():
    """Initializes and starts the Telegram bot in the current event loop."""
    from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters
    from bot.handlers.start import start_handler
    from bot.handlers.status import status_handler
    from bot.handlers.done import done_handler
    from bot.handlers.question import question_handler
    from bot.scheduler import start_scheduler
    
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    if not token or token == "your_telegram_bot_token":
        logger.warning("TELEGRAM_BOT_TOKEN not set — Telegram bot will NOT start.")
        return None

    try:
        app = ApplicationBuilder().token(token).build()

        app.add_handler(CommandHandler("start", start_handler))
        app.add_handler(CommandHandler("status", status_handler))
        app.add_handler(CommandHandler("done", done_handler))
        app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, question_handler))

        await app.initialize()
        start_scheduler(app)
        await app.start()
        asyncio.create_task(app.updater.start_polling(drop_pending_updates=True))
        logger.info("Telegram Bot started (polling mode, background task)...")
        return app
    except Exception as e:
        logger.error(f"Telegram bot failed to start: {e}")
        return None

# ---------------------------------------------------------------------------
# FastAPI Lifespan — initializes DB + launches Telegram bot natively
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    init_db()
    logger.info("Database initialized on startup")

    bot_app = await _init_telegram_bot()

    yield  # App is running

    # --- Shutdown ---
    logger.info("Shutting down...")
    if bot_app:
        logger.info("Stopping Telegram bot...")
        try:
            await bot_app.updater.stop()
            await bot_app.stop()
            await bot_app.shutdown()
            logger.info("Telegram bot stopped.")
        except Exception as e:
            logger.error(f"Error stopping Telegram bot: {e}")

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
    experience_level: str = "intermediate"

class SettingsUpdate(BaseModel):
    theme: str
    primary_model: str = None
    experience_level: str = None

class ChatPayload(BaseModel):
    message: str

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

def validate_uuid(id_str: str, name: str = "workspace_id"):
    try:
        uuid.UUID(id_str)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {name} format. Must be a valid UUID.")

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
    
    existing_ws = get_workspace_by_idea(idea, user_id)
    if existing_ws:
        is_failed = (
            "Unable to generate" in str(existing_ws.get("research", {})) or
            "Unable to generate" in str(existing_ws.get("plan", {}))
        )
        if is_failed:
            logger.info(f"Workspace exists but contains failed generations for idea '{idea}'. Deleting and regenerating.")
            delete_workspace(existing_ws["id"], user_id)
        else:
            logger.info(f"Workspace already exists for idea '{idea}'. Loading cached result.")
            return {
                "workspace_id": existing_ws["id"],
                "research": existing_ws["research"],
                "plan": existing_ws["plan"],
                "critique": existing_ws.get("critique", {}),
                "is_saved": existing_ws.get("is_saved", False),
                "chat_history": existing_ws.get("chat_history", [])
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
        "critique": critique,
        "chat_history": []
    }
    # Passively save to history — never fail the request if this errors
    try:
        save_history(idea=idea, result=result, user_id=user_id)
    except Exception as e:
        logger.error(f"Failed to save history: {e}")
    return result

@app.get("/api/workspaces/{workspace_id}/telegram-link")
def get_telegram_link_endpoint(workspace_id: str, user_id: str = Depends(get_current_user_id)):
    validate_uuid(workspace_id)
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

@app.get("/api/notifications")
def get_notifications(user_id: str = Depends(get_current_user_id)):
    from db import get_supabase
    supabase = get_supabase()
    res = supabase.table("workspaces").select("id, idea, plan_json, created_at").eq("user_id", user_id).order("created_at", desc=True).execute()
    
    notifications = []
    for row in (res.data or []):
        ws_id = row["id"]
        link = get_telegram_link_by_workspace_id(ws_id)
        plan_json = row.get("plan_json") or {}
        roadmap = plan_json.get("roadmap", [])
        
        if len(roadmap) > 0 and not link:
            notifications.append({
                "type": "needs_telegram",
                "workspace_id": ws_id,
                "idea": row["idea"],
                "message": f"Connect Telegram to track milestones for {row['idea']}",
                "timestamp": row["created_at"]
            })
            
    return notifications[:4]

@app.get("/api/activity")
def get_activity(user_id: str = Depends(get_current_user_id)):
    from db import get_supabase
    supabase = get_supabase()
    res = supabase.table("workspaces").select("id, idea, created_at, saved_at").eq("user_id", user_id).execute()
    
    activities = []
    for row in (res.data or []):
        ws_id = row["id"]
        activities.append({
            "type": "analyzed",
            "message": f"Analyzed {row['idea']}",
            "timestamp": row["created_at"],
            "workspace_id": ws_id
        })
        
        if row.get("saved_at"):
            activities.append({
                "type": "saved",
                "message": f"Favorited {row['idea']}",
                "timestamp": row["saved_at"],
                "workspace_id": ws_id
            })
            
        link = get_telegram_link_by_workspace_id(ws_id)
        if link and link.get("linked_at"):
            activities.append({
                "type": "telegram_linked",
                "message": f"Linked Telegram for {row['idea']}",
                "timestamp": link["linked_at"],
                "workspace_id": ws_id
            })
            
    # sort by timestamp desc
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    return activities[:5]

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
            "workspace_id": workspace.get("id"),
            "research": workspace["research"],
            "plan": workspace["plan"],
            "is_saved": workspace.get("is_saved", False),
            "critique": workspace.get("critique", {}),
            "chat_history": workspace.get("chat_history", [])
        }

@app.patch("/api/workspaces/{workspace_id}/save")
def toggle_save(workspace_id: str, user_id: str = Depends(get_current_user_id)):
    validate_uuid(workspace_id)
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
    if payload.primary_model and payload.primary_model not in ["gemini", "grok"]:
        raise HTTPException(status_code=400, detail="Primary model must be 'gemini' or 'grok'")
    if payload.experience_level and payload.experience_level not in ["beginner", "intermediate", "advanced"]:
        raise HTTPException(status_code=400, detail="Experience level must be 'beginner', 'intermediate', or 'advanced'")
    return update_user_settings(user_id, payload.theme, payload.primary_model, payload.experience_level)

@app.post("/api/workspaces/{workspace_id}/refresh")
async def refresh_workspace(workspace_id: str, user_id: str = Depends(get_current_user_id)):
    validate_uuid(workspace_id)
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
        question=payload.question,
        experience_level=payload.experience_level
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

@app.get("/api/founder-profile")
async def get_founder_profile(user_id: str = Depends(get_current_user_id)):
    try:
        from db import get_supabase
        supabase = get_supabase()
        res = supabase.table("workspaces").select("idea, research_json, plan_json").eq("user_id", user_id).execute()
        workspace_summaries = []
        for row in (res.data or []):
            research = dict(row.get("research_json") or {})
            critique = research.pop("_critique", {})
            workspace_summaries.append({
                "idea": row["idea"],
                "critique": critique,
                "plan": row.get("plan_json") or {},
                "research": research
            })
        result = await generate_founder_insight(workspace_summaries)
        return result
    except Exception as e:
        logger.error(f"Failed to generate founder profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate founder profile")

@app.post("/api/workspaces/{workspace_id}/chat")
async def workspace_chat(
    workspace_id: str, 
    payload: ChatPayload, 
    user_id: str = Depends(get_current_user_id)
):
    validate_uuid(workspace_id)
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
        
    workspace = get_workspace(workspace_id, user_id=user_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found or unauthorized")
        
    # Get user settings to check primary model
    settings = get_user_settings(user_id)
    primary_model = settings.get("primary_model", "gemini")
    experience_level = settings.get("experience_level", "intermediate")
    
    level_instruction = {
        "beginner": "The user is a beginner. Use plain language, no unexplained jargon, 3-4 short sentences, and use an analogy if it helps.",
        "intermediate": "The user has intermediate experience. Assume basic software and startup familiarity.",
        "advanced": "The user is advanced. Be precise and dense, skip basic definitions."
    }.get(experience_level, "The user has intermediate experience. Assume basic software and startup familiarity.")
    
    # Extract details
    idea = workspace.get("idea", "")
    research = workspace.get("research", {})
    plan = workspace.get("plan", {})
    critique = workspace.get("critique", {})
    chat_history = workspace.get("chat_history", [])
    
    user_msg = payload.message.strip()
    
    # Prepare system instruction / system prompt
    system_prompt = (
        "You are an elite startup advisor and technical co-founder. "
        "You are helping the user build, refine, and troubleshoot their startup concept. "
        f"The user's startup idea is: \"{idea}\"\n\n"
        "Here is the technical analysis generated for it:\n"
        f"- Research Summary: {json.dumps(research.get('market_research_summary', ''))}\n"
        f"- Key Competitors: {json.dumps(research.get('existing_solutions', []))}\n"
        f"- Technical Roadmap: {json.dumps(plan.get('tech_stack', []))} and {len(plan.get('roadmap', []))} milestones.\n"
        f"- Critique Verdict: {json.dumps(critique.get('overall_verdict', ''))}\n\n"
        "Provide helpful, specific, and actionable advice to the user's questions. "
        "Do not summarize the whole project again unless asked. Be direct, conversational, and expert. "
        f"Keep your response to a maximum of 4 sentences unless detailed step-by-step instructions are explicitly requested. {level_instruction}"
    )
    
    # Call model
    assistant_response = ""
    try:
        if primary_model == "grok":
            xai_key = os.getenv("XAI_API_KEY", "").strip() or os.getenv("GROK_API_KEY", "").strip()
            if xai_key:
                logger.info("Calling xAI Grok API for follow-up chat")
                messages = [
                    {"role": "system", "content": system_prompt},
                ]
                for msg in chat_history:
                    messages.append({"role": msg["role"], "content": msg["content"]})
                messages.append({"role": "user", "content": user_msg})
                
                async with httpx.AsyncClient() as c:
                    res = await c.post(
                        "https://api.x.ai/v1/chat/completions",
                        headers={"Authorization": f"Bearer {xai_key}", "Content-Type": "application/json"},
                        json={
                            "model": "grok-2",
                            "messages": messages,
                            "temperature": 0.7
                        },
                        timeout=30.0
                    )
                    res.raise_for_status()
                    res_json = res.json()
                    assistant_response = res_json["choices"][0]["message"]["content"]
            else:
                logger.info("xAI API key not set, falling back to Groq Llama for Grok choice")
                from agents import client as groq_client
                if groq_client:
                    messages = [
                        {"role": "system", "content": system_prompt},
                    ]
                    for msg in chat_history:
                        messages.append({"role": msg["role"], "content": msg["content"]})
                    messages.append({"role": "user", "content": user_msg})
                    
                    res = await groq_client.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=messages,
                        temperature=0.7
                    )
                    assistant_response = res.choices[0].message.content
                else:
                    raise ValueError("Neither xAI nor Groq client is configured")
        else: # gemini
            gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
            if not gemini_key:
                logger.warning("GEMINI_API_KEY not set. Falling back to Groq Llama.")
                from agents import client as groq_client
                if groq_client:
                    messages = [
                        {"role": "system", "content": system_prompt},
                    ]
                    for msg in chat_history:
                        messages.append({"role": msg["role"], "content": msg["content"]})
                    messages.append({"role": "user", "content": user_msg})
                    
                    res = await groq_client.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=messages,
                        temperature=0.7
                    )
                    assistant_response = res.choices[0].message.content
                else:
                    raise ValueError("GEMINI_API_KEY is missing and Groq fallback is unavailable.")
            else:
                logger.info("Calling Gemini Flash API for follow-up chat")
                body = {
                    "contents": [],
                    "system_instruction": {
                        "parts": [{"text": system_prompt}]
                    },
                    "generationConfig": {
                        "temperature": 0.7
                    }
                }
                for msg in chat_history:
                    role = "user" if msg["role"] == "user" else "model"
                    body["contents"].append({
                        "role": role,
                        "parts": [{"text": msg["content"]}]
                    })
                body["contents"].append({
                    "role": "user",
                    "parts": [{"text": user_msg}]
                })
                
                async with httpx.AsyncClient() as c:
                    res = await c.post(
                        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}",
                        json=body,
                        timeout=30.0
                    )
                    res.raise_for_status()
                    res_json = res.json()
                    assistant_response = res_json["candidates"][0]["content"]["parts"][0]["text"]
                    
    except Exception as e:
        logger.error(f"Error calling follow-up LLM model: {e}")
        from agents import client as groq_client
        if groq_client:
            try:
                logger.info("Last-ditch fallback to Groq Llama")
                messages = [
                    {"role": "system", "content": system_prompt},
                ]
                for msg in chat_history:
                    messages.append({"role": msg["role"], "content": msg["content"]})
                messages.append({"role": "user", "content": user_msg})
                res = await groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=messages,
                    temperature=0.7
                )
                assistant_response = res.choices[0].message.content
            except Exception as inner_e:
                raise HTTPException(status_code=500, detail=f"Failed to generate response: {e}. Fallback error: {inner_e}")
        else:
            raise HTTPException(status_code=503, detail="Primary model and fallback models are unavailable or unconfigured.")
            
    # Update chat history
    new_chat_history = list(chat_history)
    new_chat_history.append({"role": "user", "content": user_msg})
    new_chat_history.append({"role": "assistant", "content": assistant_response})
    
    update_workspace_chat_history(workspace_id, new_chat_history, user_id=user_id)
    
    return {
        "workspace_id": workspace_id,
        "message": {
            "role": "assistant",
            "content": assistant_response
        },
        "chat_history": new_chat_history
    }
