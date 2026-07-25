from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from agents import research_agent

app = FastAPI(
    title="Insights Copilot API",
    description="FastAPI backend for Insights Copilot research assistant",
    version="1.0.0"
)

# Enable CORS for the frontend app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IdeaRequest(BaseModel):
    idea: str

class AnalyzeResponse(BaseModel):
    research: str
    sources: List[str]

@app.get("/")
def read_root():
    return {
        "status": "ok",
        "service": "Insights Copilot API",
        "version": "1.0.0"
    }

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(payload: IdeaRequest):
    if not payload.idea or not payload.idea.strip():
        raise HTTPException(status_code=400, detail="The 'idea' field cannot be empty.")
    
    result = research_agent(payload.idea.strip())
    return result
