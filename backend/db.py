import os
import json
import logging
from supabase import create_client, Client
from datetime import datetime

logger = logging.getLogger(__name__)

def get_supabase() -> Client:
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_KEY", "").strip()
    if not url or not key:
        raise RuntimeError("SUPABASE_URL or SUPABASE_KEY environment variables are missing.")
    return create_client(url, key)

def init_db():
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_KEY", "").strip()
    if not url or not key:
        raise RuntimeError("SUPABASE_URL or SUPABASE_KEY environment variables are missing. Startup halted.")
    logger.info(f"Supabase configured pointing to {url}")

def save_history(idea: str, result: dict, user_id: str = None):
    try:
        supabase = get_supabase()
        payload = {
            "idea": idea,
            "result": result
        }
        if user_id:
            payload["user_id"] = user_id
        supabase.table("history").insert(payload).execute()
    except Exception as e:
        logger.error(f"Failed to save history to Supabase: {e}")

def get_all_history_summaries(user_id: str = None, saved_only: bool = False):
    try:
        supabase = get_supabase()
        
        # 1. Fetch saved workspace IDs if filtering is needed or to map is_saved state
        saved_query = supabase.table("workspaces").select("id")
        if user_id:
            saved_query = saved_query.eq("user_id", user_id)
        saved_query = saved_query.eq("is_saved", True)
        saved_res = saved_query.execute()
        saved_ids = {row["id"] for row in saved_res.data} if saved_res.data else set()

        # 2. Query history items
        query = supabase.table("history").select("id, idea, timestamp, workspace_id:result->workspace_id")
        if user_id:
            query = query.eq("user_id", user_id)
            
        if saved_only:
            if not saved_ids:
                return []
            query = query.in_("result->>workspace_id", list(saved_ids))
            
        query = query.order("id", desc=True)
        response = query.execute()
        
        result_data = []
        for row in (response.data or []):
            ws_id = row.get("workspace_id")
            result_data.append({
                "id": row["id"],
                "idea": row["idea"],
                "timestamp": row["timestamp"],
                "workspace_id": ws_id,
                "is_saved": ws_id in saved_ids if ws_id else False
            })
        return result_data
    except Exception as e:
        logger.error(f"Failed to get history summaries from Supabase: {e}")
        return []

def get_history_by_id(history_id: int, user_id: str = None):
    try:
        supabase = get_supabase()
        query = supabase.table("history").select("result")
        if user_id:
            query = query.eq("user_id", user_id)
        response = query.eq("id", history_id).execute()
        if response.data and len(response.data) > 0:
            result_payload = response.data[0]["result"]
            ws_id = result_payload.get("workspace_id")
            if ws_id:
                ws_res = supabase.table("workspaces").select("is_saved").eq("id", ws_id).execute()
                is_saved = ws_res.data[0]["is_saved"] if ws_res.data else False
                result_payload["is_saved"] = is_saved
            return result_payload
        return None
    except Exception as e:
        logger.error(f"Failed to get history item {history_id} from Supabase: {e}")
        return None

def create_workspace(workspace_id: str, idea: str, research: dict, plan: dict, user_id: str = None, critique: dict = None):
    try:
        supabase = get_supabase()
        research_data = dict(research) if research else {}
        if critique is not None:
            research_data["_critique"] = critique
            
        payload = {
            "id": workspace_id,
            "idea": idea,
            "research_json": research_data,
            "plan_json": plan,
            "is_saved": False
        }
        if user_id:
            payload["user_id"] = user_id
        supabase.table("workspaces").insert(payload).execute()
    except Exception as e:
        logger.error(f"Failed to create workspace in Supabase: {e}")

def get_workspace(workspace_id: str, user_id: str = None):
    try:
        supabase = get_supabase()
        query = supabase.table("workspaces").select("*").eq("id", workspace_id)
        if user_id:
            query = query.eq("user_id", user_id)
        response = query.execute()
        if response.data and len(response.data) > 0:
            row = response.data[0]
            research = dict(row["research_json"] or {})
            critique = research.pop("_critique", {})
            return {
                "id": row["id"],
                "idea": row["idea"],
                "research": research,
                "plan": row["plan_json"],
                "is_saved": row.get("is_saved", False),
                "critique": critique
            }
        return None
    except Exception as e:
        logger.error(f"Failed to get workspace {workspace_id} from Supabase: {e}")
        return None

def get_workspace_by_idea(idea: str, user_id: str):
    try:
        supabase = get_supabase()
        query = supabase.table("workspaces").select("*")
        if user_id:
            query = query.eq("user_id", user_id)
        res = query.execute()
        if res.data:
            target = idea.strip().lower()
            for row in res.data:
                if row["idea"].strip().lower() == target:
                    research = dict(row["research_json"] or {})
                    critique = research.pop("_critique", {})
                    return {
                        "id": row["id"],
                        "idea": row["idea"],
                        "research": research,
                        "plan": row["plan_json"],
                        "is_saved": row.get("is_saved", False),
                        "critique": critique
                    }
        return None
    except Exception as e:
        logger.error(f"Failed to find workspace by idea '{idea}': {e}")
        return None

def update_workspace_research(workspace_id: str, research: dict, user_id: str = None):
    try:
        supabase = get_supabase()
        # Retrieve existing workspace to preserve critique data
        query = supabase.table("workspaces").select("research_json").eq("id", workspace_id)
        if user_id:
            query = query.eq("user_id", user_id)
        res = query.execute()
        
        updated_research = dict(research) if research else {}
        if res.data:
            existing_critique = (res.data[0].get("research_json") or {}).get("_critique")
            if existing_critique:
                updated_research["_critique"] = existing_critique

        query = supabase.table("workspaces").update({
            "research_json": updated_research
        }).eq("id", workspace_id)
        if user_id:
            query = query.eq("user_id", user_id)
        query.execute()
    except Exception as e:
        logger.error(f"Failed to update workspace research in Supabase: {e}")
        raise e

def toggle_save_workspace(workspace_id: str, user_id: str = None):
    try:
        supabase = get_supabase()
        query = supabase.table("workspaces").select("is_saved")
        if user_id:
            query = query.eq("user_id", user_id)
        response = query.eq("id", workspace_id).execute()
        
        if not response.data:
            raise ValueError(f"Workspace {workspace_id} not found or not owned by user.")
            
        current_saved = response.data[0].get("is_saved", False)
        new_saved = not current_saved
        
        supabase.table("workspaces").update({
            "is_saved": new_saved
        }).eq("id", workspace_id).execute()
        
        return {"workspace_id": workspace_id, "is_saved": new_saved}
    except Exception as e:
        logger.error(f"Failed to toggle save for workspace {workspace_id}: {e}")
        raise e

def link_telegram(chat_id: str, workspace_id: str):
    try:
        supabase = get_supabase()
        supabase.table("telegram_links").upsert({
            "chat_id": str(chat_id),
            "workspace_id": workspace_id,
            "current_milestone_index": 0,
            "linked_at": "now()",
            "last_reminder_at": None
        }).execute()
    except Exception as e:
        logger.error(f"Failed to link telegram {chat_id} to {workspace_id} in Supabase: {e}")

def get_telegram_link(chat_id: str):
    try:
        supabase = get_supabase()
        response = supabase.table("telegram_links").select("*").eq("chat_id", str(chat_id)).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Failed to get telegram link {chat_id} from Supabase: {e}")
        return None

def update_milestone_index(chat_id: str, new_index: int):
    try:
        supabase = get_supabase()
        supabase.table("telegram_links").update({
            "current_milestone_index": new_index,
            "last_reminder_at": None
        }).eq("chat_id", str(chat_id)).execute()
    except Exception as e:
        logger.error(f"Failed to update milestone index for {chat_id} in Supabase: {e}")

def get_all_telegram_links():
    try:
        supabase = get_supabase()
        response = supabase.table("telegram_links").select("*").execute()
        return response.data
    except Exception as e:
        logger.error(f"Failed to get all telegram links from Supabase: {e}")
        return []

def update_last_reminder(chat_id: str):
    try:
        supabase = get_supabase()
        supabase.table("telegram_links").update({
            "last_reminder_at": "now()"
        }).eq("chat_id", str(chat_id)).execute()
    except Exception as e:
        logger.error(f"Failed to update last_reminder_at for {chat_id} in Supabase: {e}")

def get_user_settings(user_id: str) -> dict:
    try:
        supabase = get_supabase()
        response = supabase.table("user_settings").select("theme").eq("user_id", user_id).execute()
        if response.data:
            return {"theme": response.data[0].get("theme", "dark")}
        
        default_settings = {"user_id": user_id, "theme": "dark"}
        supabase.table("user_settings").insert(default_settings).execute()
        return {"theme": "dark"}
    except Exception as e:
        logger.error(f"Failed to get user settings: {e}")
        return {"theme": "dark"}

def update_user_settings(user_id: str, theme: str) -> dict:
    try:
        if theme not in ["light", "dark"]:
            raise ValueError("Theme must be 'light' or 'dark'")
        supabase = get_supabase()
        supabase.table("user_settings").upsert({
            "user_id": user_id,
            "theme": theme,
            "updated_at": datetime.utcnow().isoformat() + "Z"
        }).execute()
        return {"theme": theme}
    except Exception as e:
        logger.error(f"Failed to update user settings: {e}")
        return {"theme": theme}

def get_telegram_link_by_workspace_id(workspace_id: str):
    try:
        supabase = get_supabase()
        response = supabase.table("telegram_links").select("*").eq("workspace_id", workspace_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Failed to get telegram link for workspace {workspace_id}: {e}")
        return None

def save_mentor_chat(workspace_id: str, question: str, answer: str, user_id: str = None):
    try:
        supabase = get_supabase()
        payload = {
            "workspace_id": workspace_id,
            "question": question,
            "answer": answer
        }
        if user_id:
            payload["user_id"] = user_id
        supabase.table("mentor_chats").insert(payload).execute()
    except Exception as e:
        logger.error(f"Failed to save mentor chat for workspace {workspace_id}: {e}")
