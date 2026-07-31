import os
from dotenv import load_dotenv
load_dotenv()
from db import get_supabase
supabase = get_supabase()
try:
    res = supabase.table('history').select('id').in_('result->>workspace_id', ['test-uuid']).execute()
    print('Success:', res.data)
except Exception as e:
    print('Error:', e)
