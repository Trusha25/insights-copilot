import os
import re
import json
import logging
import asyncio
from datetime import datetime
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

# --- Startup API Key Diagnostics ---
_tavily_key = os.getenv("TAVILY_API_KEY", "").strip()
_github_token = os.getenv("GITHUB_TOKEN", "").strip()
logger.info(f"[STARTUP] GROQ_API_KEY present: {bool(api_key and api_key != 'your_key_here')}")
logger.info(f"[STARTUP] TAVILY_API_KEY present: {bool(_tavily_key)}, valid (non-placeholder): {bool(_tavily_key and _tavily_key != 'your_tavily_api_key_here')}")
logger.info(f"[STARTUP] GITHUB_TOKEN present: {bool(_github_token)}, valid (non-placeholder): {bool(_github_token and _github_token != 'your_github_token_here')}")

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
        logger.warning("[fetch_tavily] TAVILY_API_KEY missing or placeholder — skipping")
        return []
    try:
        async with httpx.AsyncClient() as c:
            res = await c.post("https://api.tavily.com/search", json={
                "api_key": key,
                "query": query,
                "search_depth": "basic",
                "max_results": 5
            }, timeout=10.0)
            res.raise_for_status()
            data = res.json()
            results = [{"title": r.get("title", ""), "url": r.get("url", ""), "snippet": r.get("content", ""), "source": "web"} for r in data.get("results", [])]
            logger.info(f"[fetch_tavily] Success — {len(results)} results returned for query: {query[:80]}")
            return results
    except httpx.HTTPStatusError as e:
        logger.error(f"[fetch_tavily] HTTP {e.response.status_code}: {e.response.text[:500]}")
        return []
    except Exception as e:
        logger.error(f"[fetch_tavily] {type(e).__name__}: {e}")
        return []

async def fetch_github(query: str):
    token = os.getenv("GITHUB_TOKEN", "").strip()
    headers = {"Accept": "application/vnd.github.v3+json"}
    if token and token != "your_github_token_here":
        headers["Authorization"] = f"token {token}"
    else:
        logger.warning("[fetch_github] GITHUB_TOKEN missing or placeholder — using unauthenticated (lower rate limit)")
    try:
        async with httpx.AsyncClient() as c:
            res = await c.get(f"https://api.github.com/search/repositories?q={query}&per_page=5", headers=headers, timeout=10.0)
            res.raise_for_status()
            data = res.json()
            results = [{"title": r.get("full_name", ""), "url": r.get("html_url", ""), "snippet": r.get("description", ""), "source": "github"} for r in data.get("items", [])]
            logger.info(f"[fetch_github] {len(results)} results for query: {query}")
            return results
    except httpx.HTTPStatusError as e:
        logger.error(f"[fetch_github] HTTP {e.response.status_code}: {e.response.text[:500]}")
        return []
    except Exception as e:
        logger.error(f"[fetch_github] {type(e).__name__}: {e}")
        return []

async def fetch_arxiv(query: str):
    try:
        async with httpx.AsyncClient() as c:
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
            logger.info(f"[fetch_arxiv] Success — {len(results)} results returned for query: {query[:80]}")
            return results
    except httpx.HTTPStatusError as e:
        logger.error(f"[fetch_arxiv] HTTP {e.response.status_code}: {e.response.text[:500]}")
        return []
    except Exception as e:
        logger.error(f"[fetch_arxiv] {type(e).__name__}: {e}")
        return []

async def fetch_semantic_scholar(query: str):
    """Semantic Scholar search — uses S2_API_KEY if available for higher rate limits."""
    s2_key = os.getenv("S2_API_KEY")
    headers = {}
    if s2_key:
        headers["x-api-key"] = s2_key
    else:
        logger.warning("[fetch_semantic_scholar] S2_API_KEY missing — using unauthenticated (strict rate limit)")

    try:
        async with httpx.AsyncClient() as c:
            res = await c.get(
                "https://api.semanticscholar.org/graph/v1/paper/search",
                params={"query": query, "limit": 4, "fields": "title,abstract,url,tldr"},
                headers=headers,
                timeout=10.0,
            )
            res.raise_for_status()
            data = res.json()
            out = []
            for p in data.get("data", []):
                tldr = (p.get("tldr") or {}).get("text") if p.get("tldr") else None
                out.append({
                    "title": p.get("title", ""),
                    "url": p.get("url", ""),
                    "snippet": tldr or (p.get("abstract") or "")[:300],
                    "source": "semantic_scholar",
                })
            logger.info(f"[fetch_semantic_scholar] Success — {len(out)} results returned for query: {query[:80]}")
            return out
    except httpx.HTTPStatusError as e:
        logger.error(f"[fetch_semantic_scholar] HTTP {e.response.status_code}: {e.response.text[:500]}")
        return []
    except Exception as e:
        logger.error(f"[fetch_semantic_scholar] {type(e).__name__}: {e}")
        return []

async def refine_search_queries(idea: str) -> dict:
    """
    Turns the raw idea into three purpose-specific queries so each API
    gets a query it can actually use well, instead of one generic sentence.
    """
    system_prompt = (
        "You are a search query specialist. Given a project idea, produce three distinct, keyword-dense "
        "search queries optimized for different search engines. Do not repeat the same phrasing across all three. "
        "CRITICAL: The academic_query must use terms from the idea's actual domain (e.g., for an ecology/plant-related idea, "
        "use ecology/botany/horticulture terms — not generic engineering or control-systems jargon unless the idea is literally "
        "about engineering). Do not default to abstract technical vocabulary that doesn't match the idea's subject matter.\n"
        "CRITICAL: For the technical_query, use a dual strategy: If the idea is common (e.g., 'study buddy'), retain the "
        "exact domain identity to find exact repos. If the idea is highly niche or rare (e.g., 'terrarium AI'), extract the "
        "core technical components (e.g., 'plant climate monitoring IoT') so GitHub actually returns related results instead of 0. "
        "Never just return generic tech stacks like 'react nodejs chatbot'."
    )
    user_prompt = f"""
Idea: "{idea}"
Generate JSON:
{{
  "market_query": "string — 4-8 keywords for finding existing commercial products/competitors",
  "academic_query": "string — 3-6 keywords in academic phrasing for research papers",
  "technical_query": "string — 3-6 keywords (e.g., 'AI study buddy', not 'react nlp chatbot')"
}}
"""
    try:
        return await call_llm_json(system_prompt, user_prompt)
    except Exception as e:
        logger.error(f"Failed to refine queries: {e}")
        return {
            "market_query": idea,
            "academic_query": idea,
            "technical_query": idea
        }

def filter_academic_results(results: list, idea: str, query: str) -> list:
    """Filter academic results by requiring at least one non-generic keyword overlap with the idea or query."""
    stopwords = {
        "a", "an", "the", "and", "or", "but", "if", "for", "with", "to", "of", "in", "on", "at",
        "app", "application", "software", "system", "systems", "development", "management", 
        "sustainable", "artificial", "intelligence", "ai", "machine", "learning", "ml",
        "platform", "tool", "using", "based", "approach", "method", "model", "data", "analysis",
        "that", "helps", "people", "build", "create", "make", "smart", "automated", "technology",
        "project", "solution", "framework", "web", "mobile", "design", "implementation"
    }
    
    # Extract words from both the raw idea and the LLM-translated academic query
    idea_words = set(re.findall(r'\b[a-z]{3,}\b', idea.lower()))
    query_words = set(re.findall(r'\b[a-z]{3,}\b', query.lower()))
    
    # Remove 's' at the end for basic plural matching (e.g., terrariums -> terrarium)
    idea_words = {w[:-1] if w.endswith('s') else w for w in idea_words}
    query_words = {w[:-1] if w.endswith('s') else w for w in query_words}
    
    core_keywords = (idea_words | query_words) - stopwords
    
    if not core_keywords:
        return results

    filtered = []
    for r in results:
        title = r.get("title", "")
        title_words = set(re.findall(r'\b[a-z]{3,}\b', title.lower()))
        title_words = {w[:-1] if w.endswith('s') else w for w in title_words}
        
        if core_keywords.intersection(title_words):
            filtered.append(r)
        else:
            logger.info(f"Dropped off-topic academic source: {title}")
            
    return filtered

# --- Agents ---
async def research_agent(idea: str) -> dict:
    logger.info(f"Starting research_agent for idea: {idea}")
    fallback = {
        "problem_validation": "Unable to generate — please retry.",
        "market_research_summary": "Unable to generate — please retry.",
        "existing_solutions": [],
        "research_gaps": [],
        "innovation_opportunities": [],
        "unverified_claims": [],
        "sources": [],
        "github_repos": [],
        "apis_datasets": []
    }
    try:
        queries = await refine_search_queries(idea)
        tavily_res, github_res, arxiv_res, s2_res = await asyncio.gather(
            fetch_tavily(queries["market_query"]),
            fetch_github(queries["technical_query"]),
            fetch_arxiv(queries["academic_query"]),
            fetch_semantic_scholar(queries["academic_query"])
        )
        
        academic_res = arxiv_res + s2_res
        filtered_academic_res = filter_academic_results(academic_res, idea, queries["academic_query"])
        
        all_results = tavily_res + github_res + filtered_academic_res
        
        system_prompt = (
            "You are an expert AI Research Assistant. Given a project idea and a list of normalized search\n"
            "results from the web, GitHub, arXiv, and Semantic Scholar, produce a comprehensive,\n"
            "citation-backed research summary. Follow these rules exactly:\n\n"
            "1. CITATIONS: Every claim in problem_validation, market_research_summary,\n"
            "   existing_solutions[].description, and research_gaps[].gap MUST end with a bracketed\n"
            "   citation like [1] or [2][4], referring to the 1-based index of the corresponding entry\n"
            "   in the sources array you return. Never state a claim not grounded in a specific source.\n"
            "   If results are too sparse to support a claim, say so explicitly (e.g., \"limited prior\n"
            "   art found [2]\") rather than inventing detail.\n\n"
            "2. SOURCE ROUTING: existing_solutions must be derived ONLY from entries where source_type\n"
            "   is \"web\" or \"github\". research_gaps must be derived ONLY from entries where source_type\n"
            "   is \"arxiv\" or \"semantic_scholar\" — these represent unresolved problems or limitations\n"
            "   named in academic literature, not general product gaps.\n\n"
            "3. IDEA-SPECIFIC COMPARISON: existing_solutions[].description must relate each competitor\n"
            "   back to the user's specific idea, not describe it in isolation. State what it does AND\n"
            "   why it doesn't fully address this idea (e.g., \"built for restaurants, not hostel-scale\n"
            "   batch cooking\").\n\n"
            "4. GENUINE INNOVATION, NOT RESTATEMENT: innovation_opportunities must NOT simply restate a\n"
            "   gap as an opportunity (e.g., \"no existing tool tracks X\" is a gap, not an innovation).\n"
            "   Each item must propose a specific approach or method, and must reference which\n"
            "   research_gap or existing_solution gap it responds to via the \"addresses\" field.\n\n"
            "5. CITATION GROUNDING: Before citing a source index for a claim, verify that source's\n"
            "   title/snippet actually supports that specific claim's topic. Before citing any source\n"
            "   for research_gaps or problem_validation, check whether that source's title/snippet is\n"
            "   actually about the same subject domain as the idea — not just sharing incidental keywords.\n"
            "   A source only counts as topically relevant if it addresses the idea's specific sub-topic,\n"
            "   not just its broad field. A paper about wildlife resource management is NOT sufficiently\n"
            "   on-topic for a claim about terrarium-specific research, even though both are 'ecology.'\n"
            "   If no source is specific enough, state the gap as an assumption without a citation, or\n"
            "   add it to unverified_claims.\n"
            "   CRITICAL: If absolutely no academic sources are provided or topically relevant, return an\n"
            "   empty array [] for research_gaps rather than inventing a placeholder gap or empty citation.\n\n"
            "6. IMPLICATION REASONING: For every entry in research_gaps, do not simply restate the source's\n"
            "   own conclusion. Each gap string must have two parts: (1) the specific limitation named in the\n"
            "   source, and (2) one sentence explaining what that limitation means for THIS idea specifically —\n"
            "   e.g., not just 'tutoring systems have cognitive adaptability gaps [5]' but 'tutoring systems\n"
            "   struggle to adapt explanations to a student's actual confusion [5] — meaning this AI study buddy\n"
            "   needs a way to detect where a student is stuck, not just whether their answer is right.'\n"
            "   If you cannot connect a source's finding to this specific idea, do not include it as a gap.\n"
            "   Apply this same instruction to unverified_claims and existing_solutions[].gap.\n\n"
            "7. GITHUB REPOS: If the Search Results contain entries with source_type='github', you MUST include\n"
            "   them in the github_repos array. Do not leave the github_repos array empty if GitHub results\n"
            "   were provided to you.\n\n"
            "Respond ONLY with a valid JSON object matching the requested schema. Ensure the schema includes a top-level 'fetched_at' field (leave it as an empty string, the backend will populate it)."
        )
        user_prompt = f"""
Idea: "{idea}"
Search Results: {json.dumps(all_results)}

Generate JSON:
{{
  "problem_validation": "string, 2-3 sentences, with [n] citations",
  "market_research_summary": "string, 3-5 sentences, with [n] citations",
  "existing_solutions": [
    {{ "name": "string", "description": "string, 1 sentence — what it does + why it doesn't fully address this idea, with [n] citation", "gap": "string, 1 sentence" }}
  ],
  "research_gaps": [
    {{ "gap": "string, 1 sentence describing an unresolved problem from academic literature", "citation": "[n]" }}
  ],
  "innovation_opportunities": [
    {{ "approach": "string, 1 sentence — a specific method or technique", "addresses": "string — which research_gap or existing_solution gap this responds to" }}
  ],
  "sources": [
    {{ "title": "string", "url": "string", "source_type": "web | github | arxiv | semantic_scholar" }}
  ],
  "github_repos": [
    {{ "name": "string", "url": "string", "why_relevant": "string, 1 sentence" }}
  ],
  "apis_datasets": [
    {{ "name": "string", "url": "string", "type": "api | dataset" }}
  ],
  "unverified_claims": ["string — claims made without source support, flagged for transparency"],
  "fetched_at": ""
}}
"""
        result = await call_llm_json(system_prompt, user_prompt)
        result["fetched_at"] = datetime.utcnow().isoformat() + "Z"
        logger.info("Successfully completed research_agent")
        return result
    except Exception as e:
        logger.error(f"[research_agent] {type(e).__name__}: {e}")
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
        # Truncate large dicts to avoid blowing past token limits
        research_str = json.dumps(research)
        plan_str = json.dumps(plan)
        if len(research_str) > 12000:
            logger.warning(f"[critic_agent] Truncating research from {len(research_str)} to 12000 chars")
            research_str = research_str[:12000] + '...}'
        if len(plan_str) > 12000:
            logger.warning(f"[critic_agent] Truncating plan from {len(plan_str)} to 12000 chars")
            plan_str = plan_str[:12000] + '...}'
        
        total_prompt_chars = len(research_str) + len(plan_str)
        logger.info(f"[critic_agent] Prompt payload size: research={len(research_str)} chars, plan={len(plan_str)} chars, total={total_prompt_chars} chars")

        system_prompt = (
            "You are an expert Technical Critic. Review the provided project plan against four criteria: accurate, verifiable, scalable, actionable. "
            "Do not regenerate the plan — only flag issues and give a pass/fail verdict. "
            "If any criterion fails, overall_verdict must be 'needs_revision' and flagged_issues/suggested_fixes must be non-empty. "
            "Keep notes concise (< 50 words). "
            "Every criterion's note must name the specific missing or problematic element — never a vague restatement of the criterion name itself."
        )
        user_prompt = f"""
Idea: "{idea}"
Research: {research_str}
Plan: {plan_str}

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
        logger.error(f"[critic_agent] {type(e).__name__}: {e}", exc_info=True)
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
    {{ "title": "string, name of the resource", "url": "string, a valid URL" }}
  ]
}}
"""
        result = await call_llm_json(system_prompt, user_prompt)
        logger.info("Successfully completed mentor_agent")
        return result
    except Exception as e:
        logger.error(f"Failed mentor_agent: {e}")
        return fallback
