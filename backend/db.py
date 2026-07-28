import os
import json
import logging
try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = None

from datetime import datetime

logger = logging.getLogger(__name__)

# Fallback fake client if env vars or library are missing so the app doesn't crash on startup
class DummySupabase:
    def table(self, name):
        class DummyTable:
            def select(self, *args, **kwargs): return self
            def insert(self, *args, **kwargs): return self
            def update(self, *args, **kwargs): return self
            def upsert(self, *args, **kwargs): return self
            def eq(self, *args, **kwargs): return self
            def order(self, *args, **kwargs): return self
            def execute(self): 
                class DummyRes:
                    data = []
                return DummyRes()
        return DummyTable()

def get_supabase():
    if create_client is None:
        logger.warning("Supabase package not installed. Database operations will fail silently.")
        return DummySupabase()
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_KEY", "").strip()
    if not url or not key:
        logger.warning("Supabase URL or KEY not set. Database operations will fail silently.")
        return DummySupabase()
    return create_client(url, key)

def init_db():
    url = os.environ.get("SUPABASE_URL", "").strip()
    if url:
        logger.info(f"Supabase configured pointing to {url}")
    else:
        logger.warning("Supabase not configured in environment variables.")

def save_history(idea: str, result: dict):
    try:
        supabase = get_supabase()
        supabase.table("history").insert({
            "idea": idea,
            "result": result
        }).execute()
    except Exception as e:
        logger.error(f"Failed to save history to Supabase: {e}")

def get_all_history_summaries():
    try:
        supabase = get_supabase()
        response = supabase.table("history").select("id, idea, timestamp").order("id", desc=True).execute()
        return response.data
    except Exception as e:
        logger.error(f"Failed to get history summaries from Supabase: {e}")
        return []

def get_history_by_id(history_id: int):
    try:
        supabase = get_supabase()
        response = supabase.table("history").select("result").eq("id", history_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]["result"]
        return None
    except Exception as e:
        logger.error(f"Failed to get history item {history_id} from Supabase: {e}")
        return None

def create_workspace(workspace_id: str, idea: str, research: dict, plan: dict):
    try:
        supabase = get_supabase()
        supabase.table("workspaces").insert({
            "id": workspace_id,
            "idea": idea,
            "research_json": research,
            "plan_json": plan
        }).execute()
    except Exception as e:
        logger.error(f"Failed to create workspace in Supabase: {e}")

def get_workspace(workspace_id: str):
    try:
        supabase = get_supabase()
        response = supabase.table("workspaces").select("*").eq("id", workspace_id).execute()
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
