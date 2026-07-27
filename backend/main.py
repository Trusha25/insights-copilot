from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Dict, Any
from agents import research_agent, planner_agent, critic_agent, mentor_agent
from db import init_db, save_history, get_all_history_summaries, get_history_by_id, create_workspace, get_workspace
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

@app.get("/api/health")
def health_check():
    key = os.getenv("GROQ_API_KEY", "").strip()
    is_configured = bool(key and key != "your_key_here")
    return {
        "status": "ok",
        "groq_configured": is_configured
    }

@app.post("/api/analyze")
async def analyze(payload: IdeaRequest):
    if not payload.idea or not payload.idea.strip():
        raise HTTPException(status_code=400, detail="The 'idea' field cannot be empty.")
    
    idea = payload.idea.strip()
    
    # 1. Research Agent
    research = await research_agent(idea)
    
    # 2. Planner Agent
    plan = await planner_agent(idea, research)
    
    # 3. Critic Agent
    critique = await critic_agent(idea, research, plan)
    
    workspace_id = str(uuid.uuid4())
    try:
        create_workspace(workspace_id, idea, research, plan)
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
        save_history(idea, result)
    except Exception as e:
        logger.error(f"Failed to save history: {e}")
    return result

@app.get("/api/workspaces/{workspace_id}/telegram-link")
def get_telegram_link_endpoint(workspace_id: str):
    workspace = get_workspace(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    bot_username = os.getenv("TELEGRAM_BOT_USERNAME", "insights_copilot_bot")
    return {"deep_link": f"https://t.me/{bot_username}?start={workspace_id}"}

@app.get("/api/history")
def get_history():
    return get_all_history_summaries()

@app.get("/api/history/{history_id}")
def get_history_item(history_id: int):
    item = get_history_by_id(history_id)
    if not item:
        raise HTTPException(status_code=404, detail="History item not found")
    return item

@app.post("/api/mentor")
async def mentor(payload: MentorRequest):
    if not payload.question or not payload.question.strip():
        raise HTTPException(status_code=400, detail="The 'question' field cannot be empty.")
        
    res = await mentor_agent(
        idea=payload.idea, 
        research=payload.research, 
        plan=payload.plan, 
        question=payload.question
    )
    return res
