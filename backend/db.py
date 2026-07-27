import sqlite3
import json
import os
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "insights.db")

def init_db():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                idea TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                result TEXT NOT NULL
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY,
                idea TEXT NOT NULL,
                research_json TEXT NOT NULL,
                plan_json TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS telegram_links (
                chat_id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                current_milestone_index INTEGER DEFAULT 0,
                linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_reminder_at TIMESTAMP,
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
            )
        ''')
        conn.commit()
        conn.close()
        logger.info(f"Database initialized at {DB_PATH}")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")

def save_history(idea: str, result: dict):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO history (idea, result) VALUES (?, ?)", 
            (idea, json.dumps(result))
        )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to save history: {e}")

def get_all_history_summaries():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id, idea, timestamp FROM history ORDER BY id DESC")
        rows = cursor.fetchall()
        conn.close()
        return [{"id": r[0], "idea": r[1], "timestamp": r[2]} for r in rows]
    except Exception as e:
        logger.error(f"Failed to get history summaries: {e}")
        return []

def get_history_by_id(history_id: int):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT result FROM history WHERE id = ?", (history_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return json.loads(row[0])
        return None
    except Exception as e:
        logger.error(f"Failed to get history item {history_id}: {e}")
        return None

def create_workspace(workspace_id: str, idea: str, research: dict, plan: dict):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO workspaces (id, idea, research_json, plan_json) VALUES (?, ?, ?, ?)", 
            (workspace_id, idea, json.dumps(research), json.dumps(plan))
        )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to create workspace: {e}")

def get_workspace(workspace_id: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id, idea, research_json, plan_json FROM workspaces WHERE id = ?", (workspace_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return {
                "id": row[0],
                "idea": row[1],
                "research": json.loads(row[2]),
                "plan": json.loads(row[3])
            }
        return None
    except Exception as e:
        logger.error(f"Failed to get workspace {workspace_id}: {e}")
        return None

def link_telegram(chat_id: str, workspace_id: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO telegram_links (chat_id, workspace_id, current_milestone_index, linked_at) 
               VALUES (?, ?, 0, CURRENT_TIMESTAMP)
               ON CONFLICT(chat_id) DO UPDATE SET 
               workspace_id=excluded.workspace_id, 
               current_milestone_index=0, 
               linked_at=CURRENT_TIMESTAMP,
               last_reminder_at=NULL""",
            (str(chat_id), workspace_id)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to link telegram {chat_id} to {workspace_id}: {e}")

def get_telegram_link(chat_id: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM telegram_links WHERE chat_id = ?", (str(chat_id),))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    except Exception as e:
        logger.error(f"Failed to get telegram link {chat_id}: {e}")
        return None

def update_milestone_index(chat_id: str, new_index: int):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE telegram_links SET current_milestone_index = ?, last_reminder_at = NULL WHERE chat_id = ?",
            (new_index, str(chat_id))
        )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to update milestone index for {chat_id}: {e}")

def get_all_telegram_links():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM telegram_links")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Failed to get all telegram links: {e}")
        return []

def update_last_reminder(chat_id: str):
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE telegram_links SET last_reminder_at = CURRENT_TIMESTAMP WHERE chat_id = ?",
            (str(chat_id),)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to update last_reminder_at for {chat_id}: {e}")
