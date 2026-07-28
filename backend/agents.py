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

# --- API Query Generator ---
async def generate_search_queries(idea: str) -> dict:
    fallback = {
        "tavily_queries": [f"{idea} commercial products", f"{idea} startups solutions"],
        "github_query": idea,
        "academic_queries": [f"{idea} technical architecture", f"{idea} research"]
    }
    if not client:
        return fallback
    
    system_prompt = (
        "You are an expert search query strategist. Given a project idea, generate optimized search queries tailored for different APIs.\n"
        "For commercial queries, target real products, official product pages, established companies, or peer-reviewed work. Do not target tutorials, templates, social posts, or student projects.\n"
        "For academic queries, include the core domain and task in every query; for recommender ideas, include terms such as recommendation, personalization, explainability, fairness, or debiasing as appropriate.\n"
        "Return ONLY a JSON object with this exact shape:\n"
        "{\n"
        '  "tavily_queries": ["3 to 4 targeted commercial or startup product search queries"],\n'
        '  "github_query": "1 concise query tailored for GitHub repository search (e.g. key keywords or tech terms)",\n'
        '  "academic_queries": ["2 academic research paper search queries suitable for arXiv and Semantic Scholar"]\n'
        "}"
    )
    user_prompt = f'Project Idea: "{idea}"'
    try:
        res = await call_llm_json(system_prompt, user_prompt, retry=False)
        tavily_q = res.get("tavily_queries", fallback["tavily_queries"])
        if not isinstance(tavily_q, list) or not tavily_q:
            tavily_q = fallback["tavily_queries"]
        github_q = res.get("github_query", fallback["github_query"])
        if not isinstance(github_q, str) or not github_q:
            github_q = fallback["github_query"]
        academic_q = res.get("academic_queries", fallback["academic_queries"])
        if not isinstance(academic_q, list) or not academic_q:
            academic_q = fallback["academic_queries"]

        return {
            "tavily_queries": tavily_q[:4],
            "github_query": github_q,
            "academic_queries": academic_q[:2]
        }
    except Exception as e:
        logger.warning(f"Failed to generate search queries via LLM, using fallback: {e}")
        return fallback

# --- API Fetchers ---
ACADEMIC_QUERY_STOPWORDS = {
    "a", "an", "and", "for", "from", "in", "of", "on", "or", "the", "to", "with",
    "academic", "analysis", "architecture", "paper", "papers", "research", "study",
    "technical", "using", "systems", "system",
}


def _academic_terms(query: str) -> list[str]:
    """Return meaningful terms used both for arXiv query construction and filtering."""
    terms = []
    for raw_term in query.lower().replace("-", " ").split():
        term = "".join(character for character in raw_term if character.isalnum())
        if len(term) >= 3 and term not in ACADEMIC_QUERY_STOPWORDS and term not in terms:
            terms.append(term)
    return terms[:6]


def _is_relevant_academic_result(result: dict, query: str) -> bool:
    terms = _academic_terms(query)
    if not terms:
        return True

    text = f"{result.get('title', '')} {result.get('snippet', '')}".lower()
    matches = sum(1 for term in terms if term in text)
    required_matches = 2 if len(terms) >= 2 else 1
    return matches >= required_matches


async def fetch_tavily(queries: list[str]) -> tuple[list[dict], str]:
    key = os.getenv("TAVILY_API_KEY", "").strip()
    if not key or key == "your_tavily_api_key_here":
        logger.warning("Tavily API key missing or default")
        return [], "failed"
    
    results = []
    try:
        async with httpx.AsyncClient(timeout=7.0) as c:
            async def run_query(q):
                res = await c.post("https://api.tavily.com/search", json={
                    "api_key": key,
                    "query": q,
                    "search_depth": "basic",
                    "max_results": 3
                })
                res.raise_for_status()
                data = res.json()
                return [{"title": r.get("title", ""), "url": r.get("url", ""), "snippet": r.get("content", ""), "source": "tavily"} for r in data.get("results", [])]
            
            tasks = [run_query(q) for q in queries]
            query_results = await asyncio.gather(*tasks, return_exceptions=True)
            for res in query_results:
                if isinstance(res, list):
                    results.extend(res)
                elif isinstance(res, Exception):
                    logger.error(f"Tavily subquery failed: {res}")
            
            unique_results = []
            seen_urls = set()
            for r in results:
                if r.get("url") and r["url"] not in seen_urls:
                    seen_urls.add(r["url"])
                    unique_results.append(r)
            
            if not unique_results:
                return [], "empty"
            return unique_results, "ok"
    except Exception as e:
        logger.error(f"Tavily fetch failed: {e}")
        return [], "failed"

async def fetch_github(query: str) -> tuple[list[dict], str]:
    token = os.getenv("GITHUB_TOKEN", "").strip()
    headers = {"Accept": "application/vnd.github.v3+json", "User-Agent": "InsightsCopilot-App"}
    if token and token != "your_github_token_here":
        headers["Authorization"] = f"token {token}"
    try:
        async with httpx.AsyncClient(timeout=7.0) as c:
            res = await c.get(f"https://api.github.com/search/repositories?q={query}&per_page=4", headers=headers)
            res.raise_for_status()
            data = res.json()
            items = data.get("items", [])
            results = [{"title": r.get("full_name", ""), "url": r.get("html_url", ""), "snippet": r.get("description", "") or "", "source": "github"} for r in items]
            if not results:
                return [], "empty"
            return results, "ok"
    except Exception as e:
        logger.error(f"GitHub fetch failed: {e}")
        return [], "failed"

async def fetch_arxiv(queries: list[str]) -> tuple[list[dict], str]:
    results = []
    failed_queries = 0
    try:
        async with httpx.AsyncClient(timeout=12.0) as c:
            async def run_query(q):
                terms = _academic_terms(q)
                search_query = " AND ".join(f"all:{term}" for term in terms) or f"all:{q}"
                res = await c.get(
                    "https://export.arxiv.org/api/query",
                    params={"search_query": search_query, "start": 0, "max_results": 3},
                )
                res.raise_for_status()
                root = ET.fromstring(res.text)
                ns = {'atom': 'http://www.w3.org/2005/Atom'}
                sub_res = []
                for entry in root.findall('atom:entry', ns):
                    title_el = entry.find('atom:title', ns)
                    url_el = entry.find('atom:id', ns)
                    summary_el = entry.find('atom:summary', ns)
                    
                    title = title_el.text if title_el is not None else ""
                    url = url_el.text if url_el is not None else ""
                    summary = summary_el.text if summary_el is not None else ""
                    
                    if url:
                        sub_res.append({
                            "title": title.strip().replace('\n', ' '), 
                            "url": url.strip(), 
                            "snippet": summary.strip().replace('\n', ' '), 
                            "source": "arxiv"
                        })
                relevant = [
                    item for item in sub_res if _is_relevant_academic_result(item, q)
                ]
                dropped = len(sub_res) - len(relevant)
                if dropped:
                    logger.warning(
                        "Dropped %d irrelevant arXiv result(s) for query %r",
                        dropped,
                        q,
                    )
                return relevant
            
            tasks = [run_query(q) for q in queries]
            query_results = await asyncio.gather(*tasks, return_exceptions=True)
            for res in query_results:
                if isinstance(res, list):
                    results.extend(res)
                else:
                    failed_queries += 1
                    logger.warning("arXiv sub-query failed: %s", res)
            
            unique_results = []
            seen_urls = set()
            for r in results:
                if r.get("url") and r["url"] not in seen_urls:
                    seen_urls.add(r["url"])
                    unique_results.append(r)
            
            if not unique_results:
                return [], "failed" if failed_queries == len(queries) else "empty"
            return unique_results, "ok"
    except Exception as e:
        logger.error(f"arXiv fetch failed: {e}")
        return [], "failed"

async def fetch_semantic_scholar(queries: list[str]) -> tuple[list[dict], str]:
    ss_api_key = os.getenv("SEMANTIC_SCHOLAR_API_KEY", "").strip()
    headers = {"User-Agent": "InsightsCopilot-App"}
    if ss_api_key and ss_api_key != "your_semantic_scholar_key_here":
        headers["x-api-key"] = ss_api_key
        logger.info("Semantic Scholar: using authenticated mode")
    else:
        logger.info("Semantic Scholar: using unauthenticated mode (low rate limit)")

    results = []
    failed_queries = 0
    try:
        async with httpx.AsyncClient(timeout=12.0) as c:
            for q in queries:
                url = "https://api.semanticscholar.org/graph/v1/paper/search"
                params = {
                    "query": q,
                    "limit": 3,
                    "fields": "title,url,abstract,citationCount"
                }
                retries = 3
                res = None
                for attempt in range(retries):
                    try:
                        logger.info("[SemScholar DEBUG] Attempt %d for query: %r", attempt + 1, q)
                        res = await c.get(url, params=params, headers=headers)
                        logger.info("[SemScholar DEBUG] HTTP %s for query %r", res.status_code, q)
                        if res.status_code == 429:
                            body_preview = res.text[:500]
                            logger.warning(
                                "[SemScholar DEBUG] Rate limited (429). Body: %s", body_preview
                            )
                            await asyncio.sleep(2.0 * (attempt + 1))
                            continue
                        if res.status_code != 200:
                            body_preview = res.text[:500]
                            logger.warning(
                                "[SemScholar DEBUG] Non-200 response. Status: %s, Body: %s",
                                res.status_code, body_preview
                            )
                        res.raise_for_status()
                        break
                    except httpx.HTTPStatusError:
                        if attempt == retries - 1:
                            logger.warning("[SemScholar DEBUG] All retries exhausted for query %r", q)
                            res = None
                    except Exception as sub_e:
                        logger.warning(
                            "[SemScholar DEBUG] Exception on attempt %d for query %r: %s",
                            attempt + 1, q, sub_e
                        )
                        if attempt == retries - 1:
                            res = None

                if not res or res.status_code != 200:
                    failed_queries += 1
                    if res is not None:
                        logger.warning(
                            "[SemScholar DEBUG] Final failure: HTTP %s for query %r",
                            res.status_code, q,
                        )
                elif res.status_code == 200:
                    data = res.json()
                    logger.info(
                        "[SemScholar DEBUG] Got %d papers for query %r",
                        len(data.get("data", [])), q
                    )
                    for paper in data.get("data", []):
                        paper_url = paper.get("url") or f"https://www.semanticscholar.org/paper/{paper.get('paperId', '')}"
                        citations = paper.get("citationCount")
                        citation_str = f" [Citations: {citations}]" if citations is not None else ""
                        snippet = (paper.get("abstract") or "Academic paper from Semantic Scholar.") + citation_str
                        results.append({
                            "title": paper.get("title", ""),
                            "url": paper_url,
                            "snippet": snippet,
                            "source": "semantic_scholar"
                        })

            unique_results = []
            seen_urls = set()
            for r in results:
                if r.get("url") and r["url"] not in seen_urls:
                    seen_urls.add(r["url"])
                    unique_results.append(r)

            if not unique_results:
                return [], "failed" if failed_queries == len(queries) else "empty"
            return unique_results, "ok"
    except Exception as e:
        logger.error(f"[SemScholar DEBUG] Top-level fetch failed: {e}")
        return [], "failed"


def build_research_fallback(
    search_results: list[dict],
    sources_status: dict,
) -> dict:
    """Keep retrieved evidence visible when synthesis is unavailable."""
    existing_solutions = []
    research_gaps = []
    for item in search_results:
        source_type = item.get("source")
        title = (item.get("title") or "Untitled source").strip()
        snippet = " ".join((item.get("snippet") or "").split())[:320]
        claim = f"Retrieved source: {title}."
        if snippet:
            claim += f" {snippet}"
        normalized = {
            "claim": claim,
            "source_url": item.get("url", ""),
            "source_type": source_type,
        }
        if source_type in {"tavily", "github"} and len(existing_solutions) < 5:
            existing_solutions.append(normalized)
        elif source_type in {"arxiv", "semantic_scholar"} and len(research_gaps) < 5:
            research_gaps.append(normalized)

    return {
        "existing_solutions": existing_solutions,
        "research_gaps": research_gaps,
        "recommended_approach": {
            "summary": "Retrieved sources are available, but research synthesis is temporarily unavailable. Retry after the language-model rate limit resets.",
            "justification": [],
        },
        "unverified_flags": [
            "The items above are raw retrieved evidence and were not synthesized or ranked because the language-model request failed."
        ],
        "sources_status": sources_status,
    }

# --- Agents ---
async def research_agent(idea: str) -> dict:
    logger.info(f"Starting research_agent for idea: {idea}")
    
    # 1. Generate queries tailored per source
    queries = await generate_search_queries(idea)
    tavily_q = queries.get("tavily_queries", [idea])
    github_q = queries.get("github_query", idea)
    academic_q = queries.get("academic_queries", [idea])
    
    # 2. Run all fetches in parallel with timeouts
    async def safe_fetch(coro, timeout=7.0):
        try:
            return await asyncio.wait_for(coro, timeout=timeout)
        except Exception as e:
            logger.error(f"Fetch wrapper timed out or failed: {e}")
            return [], "failed"
            
    tavily_task = safe_fetch(fetch_tavily(tavily_q), timeout=7.0)
    github_task = safe_fetch(fetch_github(github_q), timeout=7.0)
    arxiv_task = safe_fetch(fetch_arxiv(academic_q), timeout=15.0)
    sem_scholar_task = safe_fetch(fetch_semantic_scholar(academic_q), timeout=15.0)
    
    (tavily_res, tav_status), (github_res, gh_status), (arxiv_res, arx_status), (sem_res, sem_status) = await asyncio.gather(
        tavily_task, github_task, arxiv_task, sem_scholar_task
    )
    
    sources_status = {
        "tavily": tav_status,
        "github": gh_status,
        "arxiv": arx_status,
        "semantic_scholar": sem_status
    }
    
    all_search_results = tavily_res + github_res + arxiv_res + sem_res

    # Number each source 1-based so the LLM can cite by index
    numbered_sources = []
    for i, item in enumerate(all_search_results, start=1):
        numbered_sources.append({
            "index": i,
            "title": item.get("title", ""),
            "url": item.get("url", ""),
            "snippet": item.get("snippet", ""),
            "source": item.get("source", "")
        })

    fallback = {
        "existing_solutions": [],
        "research_gaps": [],
        "recommended_approach": {
            "summary": "Unable to synthesize research results at this time.",
            "justification": []
        },
        "unverified_flags": ["Research synthesis failed due to system error."],
        "sources_status": sources_status,
        "sources": numbered_sources
    }

    try:
        system_prompt = (
            "You are an expert AI Research Assistant. Given a project idea and a NUMBERED list of search results "
            "from commercial web search (tavily), GitHub repos, arXiv papers, and Semantic Scholar papers, "
            "synthesize a strict citation-backed analysis.\n\n"
            "CITATION FORMAT — NON-NEGOTIABLE:\n"
            "Every source in the provided list has an 'index' field (1-based). "
            "Every claim in existing_solutions[].claim, research_gaps[].claim, and recommended_approach.summary "
            "MUST end with a bracketed source index referencing the exact source it draws from, e.g., "
            "'Duolingo uses spaced repetition for language learning but has no legal domain content [3]'. "
            "Multiple indices are allowed: [2][5]. A claim WITHOUT a bracketed index is INVALID.\n\n"
            "EXISTING SOLUTIONS — NAMED PRODUCTS ONLY:\n"
            "Only include entries in existing_solutions that name a specific real product, company, tool, or repository "
            "found in the search results (e.g., 'Kira Systems', 'LawGeex', 'ContractPodAi', a named GitHub repo). "
            "If the web results do not surface a specific named product, do NOT force an entry — instead note in "
            "unverified_flags that no direct named competitor was found. "
            "Each existing_solutions entry's claim must state what the product does AND specifically why it "
            "does not fully address this idea (e.g., 'built for enterprise contract review, not small business leases').\n\n"
            "CRITICAL RULES:\n"
            "1. Every item in existing_solutions and research_gaps MUST have a real source_url copied exactly from the provided search results. NEVER invent, modify, or hallucinate a URL. If you cannot ground a claim in a retrieved URL, list it in unverified_flags instead.\n"
            "2. Prefer official product pages, established companies, peer-reviewed papers, and mature open-source projects. Do not use tutorials, templates, social posts, student repositories, or generic listicles as existing solutions.\n"
            "3. recommended_approach.justification MUST reference specific claim strings from research_gaps using the 'references_gap' field. Every justification claim must be directly traceable to a research gap claim text.\n"
            "4. Include at most 5 items per array. Empty arrays are valid when there is not enough relevant evidence; never add unrelated or invented items to reach a minimum.\n"
            "5. A paper abstract is evidence, not automatically a research gap. A research gap must describe a limitation or unmet need relevant to the project idea.\n"
            "6. The recommended approach MUST explicitly name one dataset, one model architecture, one explainability technique when relevant, one debiasing method when relevant, and one scalability strategy.\n"
            "7. Do NOT use hedging language ('might', 'could potentially', 'may help'). State all findings directly as factual statements backed by sources.\n"
            "8. Respond strictly in valid JSON mode adhering to the requested schema."
        )

        user_prompt = f"""
Project Idea: "{idea}"

Numbered Search Results (cite by [index]):
{json.dumps(numbered_sources, indent=2)}

API Sources Status:
{json.dumps(sources_status, indent=2)}

Generate a JSON object matching this schema EXACTLY:
{{
  "existing_solutions": [
    {{ "claim": "string ending with [N] citation index", "source_url": "string (MUST be exact URL from search results)", "source_type": "tavily|github" }}
  ],
  "research_gaps": [
    {{ "claim": "string ending with [N] citation index", "source_url": "string (MUST be exact URL from search results)", "source_type": "arxiv|semantic_scholar" }}
  ],
  "recommended_approach": {{
    "summary": "string with [N] citations, 2-3 concise sentences",
    "justification": [
      {{ "claim": "string", "references_gap": "string (MUST match a claim text from research_gaps)" }}
    ]
  }},
  "unverified_flags": [
    "string — any unverified claim or concern without a verified retrieved URL source"
  ]
}}
"""
        result = await call_llm_json(system_prompt, user_prompt)
        result["sources_status"] = sources_status
        result["sources"] = numbered_sources
        logger.info("Successfully completed research_agent synthesis")
        return result
    except Exception as e:
        logger.error(f"Failed research_agent synthesis: {e}")
        return build_research_fallback(all_search_results, sources_status)

async def planner_agent(idea: str, research: dict) -> dict:
    logger.info("Starting planner_agent")
    fallback = {
        "architecture": "Unable to generate — please retry.",
        "architecture_mermaid": "graph TD\n  A[Frontend] --> B[Backend]",
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
            "Ground EVERY recommendation in the provided research data (existing_solutions, research_gaps, recommended_approach). "
            "No generic advice untethered from the identified research gaps and recommended approach. "
            "Constraints:\n"
            "- Actionable: every roadmap step must be something a team can literally start doing.\n"
            "- Verifiable: tech stack and libraries must be real, currently-existing tools — no invented package names.\n"
            "- Scalable: architecture must note what changes beyond hackathon-prototype scale.\n"
            "- Accurate: prefer a conservative general claim over a fabricated specific one.\n"
            "Keep string fields concise (< 50 words) EXCEPT documentation.sections[].content."
        )
        user_prompt = f"""
Idea: "{idea}"
Research Data: {json.dumps(research)}

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
            "For recommendation or machine-learning projects, fail actionable if the plan does not explicitly name a dataset, model architecture, and evaluation method. "
            "Fail scalable if it does not name a concrete scalability approach. "
            "Fail accurate or verifiable if research contains irrelevant papers, weak sources presented as competitors, or unsupported bias/debiasing claims. "
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
