import os
import json
import logging
import asyncio
import httpx
from dotenv import load_dotenv
from groq import AsyncGroq
import xml.etree.ElementTree as ET

current_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(current_dir, ".env"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Shared Groq Client
api_key = os.getenv("GROQ_API_KEY", "").strip()
client = AsyncGroq(api_key=api_key) if api_key and api_key != "your_key_here" else None

async def call_llm_json(system_prompt: str, user_prompt: str, retry: bool = True) -> dict:
    if not client:
        raise ValueError("Groq client not configured")
        
    async def make_call(prompt_suffix=""):
        res = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt + prompt_suffix}
            ],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        return res.choices[0].message.content

    content = await make_call()
    
    def parse_content(text):
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return json.loads(text.strip())

    try:
        return parse_content(content)
    except Exception:
        if retry:
            logger.info("Retrying call_llm_json due to parse failure")
            content = await make_call("\nReturn valid JSON only, no other text")
            try:
                return parse_content(content)
            except Exception as e:
                raise ValueError(f"Failed to parse JSON twice. Raw output: {content}") from e
        else:
            raise ValueError(f"Failed to parse JSON. Raw output: {content}")

# --- API Fetchers ---
async def fetch_tavily(query: str):
    key = os.getenv("TAVILY_API_KEY", "").strip()
    if not key or key == "your_tavily_api_key_here":
        return []
    try:
        async with httpx.AsyncClient() as c:
            res = await c.post("https://api.tavily.com/search", json={
                "api_key": key,
                "query": query,
                "search_depth": "basic",
                "max_results": 3
            }, timeout=10.0)
            res.raise_for_status()
            data = res.json()
            return [{"title": r.get("title", ""), "url": r.get("url", ""), "snippet": r.get("content", ""), "source": "web"} for r in data.get("results", [])]
    except Exception as e:
        logger.error(f"Tavily fetch failed: {e}")
        return []

async def fetch_github(query: str):
    token = os.getenv("GITHUB_TOKEN", "").strip()
    headers = {"Accept": "application/vnd.github.v3+json"}
    if token and token != "your_github_token_here":
        headers["Authorization"] = f"token {token}"
    try:
        async with httpx.AsyncClient() as c:
            res = await c.get(f"https://api.github.com/search/repositories?q={query}&per_page=3", headers=headers, timeout=10.0)
            res.raise_for_status()
            data = res.json()
            return [{"title": r.get("full_name", ""), "url": r.get("html_url", ""), "snippet": r.get("description", ""), "source": "github"} for r in data.get("items", [])]
    except Exception as e:
        logger.error(f"GitHub fetch failed: {e}")
        return []

async def fetch_arxiv(query: str):
    try:
        async with httpx.AsyncClient() as c:
            # Note: arXiv API uses literal space or + for query, httpx will encode it if we pass it as a URL string carefully
            query_safe = query.replace(" ", "+")
            res = await c.get(f"https://export.arxiv.org/api/query?search_query=all:{query_safe}&start=0&max_results=3", timeout=10.0)
            res.raise_for_status()
            root = ET.fromstring(res.text)
            ns = {'atom': 'http://www.w3.org/2005/Atom'}
            results = []
            for entry in root.findall('atom:entry', ns):
                title_el = entry.find('atom:title', ns)
                url_el = entry.find('atom:id', ns)
                summary_el = entry.find('atom:summary', ns)
                
                title = title_el.text if title_el is not None else ""
                url = url_el.text if url_el is not None else ""
                summary = summary_el.text if summary_el is not None else ""
                
                results.append({
                    "title": title.strip().replace('\n', ' '), 
                    "url": url.strip(), 
                    "snippet": summary.strip().replace('\n', ' '), 
                    "source": "arxiv"
                })
            return results
    except Exception as e:
        logger.error(f"arXiv fetch failed: {e}")
        return []

# --- Agents ---
async def research_agent(idea: str) -> dict:
    logger.info(f"Starting research_agent for idea: {idea}")
    fallback = {
        "problem_validation": "Unable to generate — please retry.",
        "market_research_summary": "Unable to generate — please retry.",
        "existing_solutions": [],
        "innovation_opportunities": [],
        "sources": [],
        "github_repos": [],
        "apis_datasets": []
    }
    try:
        tavily_res, github_res, arxiv_res = await asyncio.gather(
            fetch_tavily(idea),
            fetch_github(idea),
            fetch_arxiv(idea)
        )
        all_results = tavily_res + github_res + arxiv_res
        
        system_prompt = (
            "You are an expert AI Research Assistant. Given a project idea and a list of normalized search results "
            "from the web, GitHub, and arXiv, produce a comprehensive research summary. "
            "Respond ONLY with a valid JSON object matching the requested schema."
        )
        user_prompt = f"""
Idea: "{idea}"
Search Results: {json.dumps(all_results)}

Generate JSON:
{{
  "problem_validation": "string, 2-3 sentences",
  "market_research_summary": "string, 3-5 sentences synthesizing what was found",
  "existing_solutions": [
    {{ "name": "string", "description": "string, 1 sentence", "gap": "string, 1 sentence — what it doesn't solve" }}
  ],
  "innovation_opportunities": ["string, 1 sentence each — 3-5 items"],
  "sources": [
    {{ "title": "string", "url": "string", "source_type": "web | github | arxiv" }}
  ],
  "github_repos": [
    {{ "name": "string", "url": "string", "why_relevant": "string, 1 sentence" }}
  ],
  "apis_datasets": [
    {{ "name": "string", "url": "string", "type": "api | dataset" }}
  ]
}}
"""
        result = await call_llm_json(system_prompt, user_prompt)
        logger.info("Successfully completed research_agent")
        return result
    except Exception as e:
        logger.error(f"Failed research_agent: {e}")
        return fallback

async def planner_agent(idea: str, research: dict) -> dict:
    logger.info("Starting planner_agent")
    fallback = {
        "architecture": "Unable to generate — please retry.",
        "tech_stack": [],
        "roadmap": [],
        "timeline": "Unable to generate — please retry.",
        "documentation": {
            "overview": "Unable to generate — please retry.",
            "sections": []
        }
    }
    try:
        system_prompt = (
            "You are an expert Technical Project Planner. "
            "Ground EVERY recommendation in the provided research dict (existing solutions, gaps, sources). "
            "No generic advice untethered from what was found. "
            "Constraints:\n"
            "- Actionable: every roadmap step must be something a team can literally start doing.\n"
            "- Verifiable: tech stack and libraries must be real, currently-existing tools — no invented package names.\n"
            "- Scalable: architecture must note what changes beyond hackathon-prototype scale.\n"
            "- Accurate: prefer a conservative general claim over a fabricated specific one.\n"
            "Keep string fields concise (< 50 words) EXCEPT documentation.sections[].content."
        )
        user_prompt = f"""
Idea: "{idea}"
Research: {json.dumps(research)}

Generate JSON with EXACTLY 5 milestone objects in the roadmap array, each having at least 4 tasks:
{{
  "architecture": "string, 3-5 sentences: components, connections, one line on scalability",
  "architecture_mermaid": "string, a STRICTLY VALID Mermaid.js flowchart (e.g., 'graph TD\\n  A[Frontend] -->|API| B[Backend]') representing the system architecture. Use literal \\n for newlines. Do not use invalid arrow syntax like '-->|text|>'. Keep it simple.",
  "tech_stack": ["string — specific real tools only"],
  "roadmap": [
    {{ "milestone": "string", "tasks": ["string, concrete action 1", "string, concrete action 2", "string, concrete action 3", "string, concrete action 4", "string, concrete action 5"], "duration": "string, e.g. '2 days'" }}
  ],
  "timeline": "string, one sentence: total estimate + team size assumption",
  "documentation": {{
    "overview": "string, 2-3 sentences",
    "sections": [
      {{ "heading": "string", "content": "string, 2-4 full sentences of real content" }}
    ]
  }}
}}
"""
        result = await call_llm_json(system_prompt, user_prompt)
        logger.info("Successfully completed planner_agent")
        return result
    except Exception as e:
        logger.error(f"Failed planner_agent: {e}")
        return fallback

async def critic_agent(idea: str, research: dict, plan: dict) -> dict:
    logger.info("Starting critic_agent")
    fallback = {
        "overall_verdict": "needs_revision",
        "criteria": {
            "accurate": { "pass": False, "note": "Unable to generate — please retry." },
            "verifiable": { "pass": False, "note": "Unable to generate — please retry." },
            "scalable": { "pass": False, "note": "Unable to generate — please retry." },
            "actionable": { "pass": False, "note": "Unable to generate — please retry." }
        },
        "flagged_issues": [],
        "suggested_fixes": []
    }
    try:
        system_prompt = (
            "You are an expert Technical Critic. Review the provided project plan against four criteria: accurate, verifiable, scalable, actionable. "
            "Do not regenerate the plan — only flag issues and give a pass/fail verdict. "
            "If any criterion fails, overall_verdict must be 'needs_revision' and flagged_issues/suggested_fixes must be non-empty. "
            "Keep notes concise (< 50 words)."
        )
        user_prompt = f"""
Idea: "{idea}"
Research: {json.dumps(research)}
Plan: {json.dumps(plan)}

Generate JSON:
{{
  "overall_verdict": "ready | needs_revision",
  "criteria": {{
    "accurate": {{ "pass": true, "note": "string, 1 sentence" }},
    "verifiable": {{ "pass": true, "note": "string, 1 sentence" }},
    "scalable": {{ "pass": true, "note": "string, 1 sentence" }},
    "actionable": {{ "pass": true, "note": "string, 1 sentence" }}
  }},
  "flagged_issues": ["string, 1 sentence each — empty list if none"],
  "suggested_fixes": ["string, 1 sentence each — empty list if none"]
}}
"""
        result = await call_llm_json(system_prompt, user_prompt)
        logger.info("Successfully completed critic_agent")
        return result
    except Exception as e:
        logger.error(f"Failed critic_agent: {e}")
        return fallback

async def mentor_agent(idea: str, research: dict, plan: dict, question: str) -> dict:
    logger.info("Starting mentor_agent")
    fallback = {
        "answer": "Unable to generate — please retry.",
        "learning_resources": []
    }
    try:
        system_prompt = (
            "You are an expert Startup Mentor. Answer a specific follow-up question from the user. "
            "Ground your answer in the provided research and plan. Don't answer from generic knowledge if the provided dicts contain the answer. "
            "learning_resources: 0-3 items, only include if genuinely relevant to the question. "
            "Keep answer concise."
        )
        user_prompt = f"""
Idea: "{idea}"
Research: {json.dumps(research)}
Plan: {json.dumps(plan)}
Question: "{question}"

Generate JSON:
{{
  "answer": "string, 2-5 sentences",
  "learning_resources": [
    {{ "topic": "string", "reason": "string, 1 sentence why this is relevant" }}
  ]
}}
"""
        result = await call_llm_json(system_prompt, user_prompt)
        logger.info("Successfully completed mentor_agent")
        return result
    except Exception as e:
        logger.error(f"Failed mentor_agent: {e}")
        return fallback
