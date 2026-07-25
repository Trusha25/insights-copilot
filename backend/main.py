from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any
from agents import research_agent, planner_agent, critic_agent, mentor_agent
from db import init_db, save_history, get_all_history_summaries, get_history_by_id
import os
import logging

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Insights Copilot API",
    description="FastAPI backend for Insights Copilot four-agent architecture",
    version="2.0.0"
)

@app.on_event("startup")
async def startup_event():
    init_db()
    logger.info("Database initialized on startup")

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
    allow_credentials=True,
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
    
    result = {
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
