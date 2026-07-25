import os
import json
from dotenv import load_dotenv
from groq import Groq

# Load environment variables from .env file
load_dotenv()

def research_agent(idea: str) -> dict:
    """
    Researches existing solutions for a given idea using Groq API's llama-3.3-70b-versatile model.
    Returns a dictionary with 'research' (summary string) and 'sources' (list of strings).
    """
    api_key = os.getenv("GROQ_API_KEY")
    
    if not api_key or api_key == "your_key_here":
        return {
            "research": f"### Market & Technical Analysis for: '{idea}'\n\n"
                        "*(Note: Groq API key is missing or not configured in backend/.env. Returning fallback simulation mode)*\n\n"
                        "1. **Market Overview**: The space for this concept has strong growth potential. Key drivers include automation, real-time analytics, and user experience enhancements.\n"
                        "2. **Existing Solutions**: Current products offer partial solutions, leaving opportunities for specialized workflow integration.\n"
                        "3. **Recommended Next Steps**: Validate target audience segments, prototype key interactions, and establish core API integrations.",
            "sources": [
                "TechCrunch Industry Reports",
                "ProductHunt Trending Showcase",
                "GitHub Open Source Ecosystem",
                "Gartner Emerging Tech Horizon"
            ]
        }

    client = Groq(api_key=api_key)

    system_prompt = (
        "You are an expert AI Market & Technical Research Analyst. Your goal is to analyze user project ideas, "
        "identify existing market solutions, key competitors, technical feasibility, and reference sources."
    )

    user_prompt = f"""
    Please research the following project idea:
    "{idea}"

    Provide a detailed research analysis summary and list of sources/existing solutions.
    You MUST respond with a valid JSON object matching this exact structure:
    {{
      "research": "A thorough summary covering market overview, existing solutions, competitive landscape, key differentiators, and technical recommendations (formatted in Markdown).",
      "sources": [
        "Name of tool / solution 1 (e.g. OpenAI API - https://openai.com)",
        "Name of tool / solution 2",
        "Relevant industry framework or product"
      ]
    }}
    Do not include any text outside the JSON object.
    """

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        content = response.choices[0].message.content
        data = json.loads(content)

        return {
            "research": data.get("research", "No research summary generated."),
            "sources": data.get("sources", [])
        }
    except Exception as e:
        return {
            "research": f"### Research Error\n\nFailed to fetch research from Groq API: `{str(e)}`",
            "sources": []
        }
