import os
import sys
from dotenv import load_dotenv

# Load env from backend
env_path = r"c:\Users\Lenovo\OneDrive\Desktop\insights-copilot\backend\.env"
load_dotenv(env_path)

# Add backend to path
sys.path.append(r"c:\Users\Lenovo\OneDrive\Desktop\insights-copilot\backend")

from db import get_supabase

supabase = get_supabase()

print("Listing tables by checking schema cache / running raw requests...")

# Let's try querying standard tables to see if they exist
tables_to_test = ["user_settings", "user_profiles", "profiles", "users", "workspaces", "history", "telegram_links", "mentor_chats"]

for table in tables_to_test:
    try:
        res = supabase.table(table).select("*").limit(1).execute()
        print(f"Table '{table}' EXISTS! Row count or sample: {len(res.data) if res.data is not None else 0}")
        if res.data:
            print(f"  Columns: {list(res.data[0].keys())}")
    except Exception as e:
        print(f"Table '{table}' DOES NOT EXIST or error: {e}")
