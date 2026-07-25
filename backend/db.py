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
