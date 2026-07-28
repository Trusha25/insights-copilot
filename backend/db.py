import os
import json
import logging
from supabase import create_client, Client
from datetime import datetime

logger = logging.getLogger(__name__)

# Fallback fake client if env vars are missing so the app doesn't crash on startup
def get_supabase() -> Client:
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_KEY", "").strip()
    if not url or not key:
        raise RuntimeError("SUPABASE_URL or SUPABASE_KEY environment variables are missing.")
    return create_client(url, key)

def init_db():
    # In Supabase, initialization happens via SQL scripts run in the Supabase Dashboard.
    # We just verify we can connect.
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_KEY", "").strip()
    if not url or not key:
        raise RuntimeError("SUPABASE_URL or SUPABASE_KEY environment variables are missing. Startup halted.")
    logger.info(f"Supabase configured pointing to {url}")

def save_history(user_id: str, idea: str, result: dict):
    try:
        supabase = get_supabase()
        supabase.table("history").insert({
            "user_id": user_id,
            "idea": idea,
            "result": result
        }).execute()
    except Exception as e:
        logger.error(f"Failed to save history to Supabase: {e}")

def get_all_history_summaries(user_id: str):
    try:
        supabase = get_supabase()
        response = supabase.table("history").select("id, idea, timestamp, result").eq("user_id", user_id).order("id", desc=True).execute()
        saved_ids = set(get_saved_workspace_ids(user_id))
        formatted = []
        for row in response.data:
            result_dict = row.get("result") or {}
            ws_id = result_dict.get("workspace_id")
            formatted.append({
                "id": row.get("id"),
                "idea": row.get("idea"),
                "timestamp": row.get("timestamp"),
                "workspace_id": ws_id,
                "is_saved": ws_id in saved_ids if ws_id else False
            })
        return formatted
    except Exception as e:
        logger.error(f"Failed to get history summaries from Supabase: {e}")
        return []

def get_history_by_id(history_id: int, user_id: str):
    try:
        supabase = get_supabase()
        response = supabase.table("history").select("result").eq("id", history_id).eq("user_id", user_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]["result"]
        return None
    except Exception as e:
        logger.error(f"Failed to get history item {history_id} from Supabase: {e}")
        return None

def create_workspace(workspace_id: str, user_id: str, idea: str, research: dict, plan: dict):
    try:
        supabase = get_supabase()
        supabase.table("workspaces").insert({
            "id": workspace_id,
            "user_id": user_id,
            "idea": idea,
            "research_json": research,
            "plan_json": plan
        }).execute()
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
            return {
                "id": row["id"],
                "idea": row["idea"],
                "research": row["research_json"],
                "plan": row["plan_json"]
            }
        return None
    except Exception as e:
        logger.error(f"Failed to get workspace {workspace_id} from Supabase: {e}")
        return None

def update_workspace_research(workspace_id: str, research: dict, user_id: str = None):
    try:
        supabase = get_supabase()
        query = supabase.table("workspaces").update({
            "research_json": research
        }).eq("id", workspace_id)
        if user_id:
            query = query.eq("user_id", user_id)
        query.execute()
    except Exception as e:
        logger.error(f"Failed to update workspace research in Supabase: {e}")
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

def get_saved_workspace_ids(user_id: str) -> list:
    try:
        supabase = get_supabase()
        response = supabase.table("workspaces").select("id").eq("user_id", user_id).eq("is_saved", True).execute()
        return [row["id"] for row in response.data] if response.data else []
    except Exception as e:
        logger.error(f"Failed to get saved workspace IDs: {e}")
        return []

def toggle_workspace_saved(workspace_id: str, user_id: str):
    try:
        supabase = get_supabase()
        response = supabase.table("workspaces").select("is_saved").eq("id", workspace_id).eq("user_id", user_id).execute()
        if not response.data:
            return None
        current_state = response.data[0].get("is_saved", False)
        new_state = not current_state
        
        update_res = supabase.table("workspaces").update({"is_saved": new_state}).eq("id", workspace_id).eq("user_id", user_id).execute()
        return update_res.data[0] if update_res.data else None
    except Exception as e:
        logger.error(f"Failed to toggle workspace saved: {e}")
        return None

def get_saved_workspaces(user_id: str) -> list:
    try:
        supabase = get_supabase()
        response = supabase.table("workspaces").select("id, idea, created_at").eq("user_id", user_id).eq("is_saved", True).order("created_at", desc=True).execute()
        formatted = []
        for row in response.data:
            formatted.append({
                "id": row["id"],
                "idea": row["idea"],
                "timestamp": row["created_at"],
                "workspace_id": row["id"],
                "is_saved": True
            })
        return formatted
    except Exception as e:
        logger.error(f"Failed to get saved workspaces: {e}")
        return []

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
        response = supabase.table("user_settings").upsert({
            "user_id": user_id,
            "theme": theme,
            "updated_at": datetime.utcnow().isoformat() + "Z"
        }).execute()
        return {"theme": theme}
    except Exception as e:
        logger.error(f"Failed to update user settings: {e}")
        return {"theme": theme}
