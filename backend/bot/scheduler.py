from apscheduler.schedulers.asyncio import AsyncIOScheduler
import logging
from datetime import datetime, timedelta
from db import get_all_telegram_links, get_workspace, update_last_reminder

logger = logging.getLogger(__name__)

def parse_date(date_str):
    if not date_str:
        return None
    try:
        # Supabase/PostgreSQL ISO format (e.g., 2024-03-20T10:15:30.123+00:00)
        return datetime.fromisoformat(date_str.replace('Z', '+00:00')).replace(tzinfo=None)
    except ValueError:
        try:
            # Old SQLite format
            return datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            return None

async def check_reminders(app):
    logger.info("Running reminder scheduler check...")
    links = get_all_telegram_links()
    now = datetime.utcnow()

    for link in links:
        try:
            chat_id = link["chat_id"]
            workspace_id = link["workspace_id"]
            current_index = link["current_milestone_index"]
            
            linked_at_str = link.get("linked_at")
            last_reminder_str = link.get("last_reminder_at")
            
            base_time = parse_date(linked_at_str)
            if not base_time:
                continue

            # Don't send more than one reminder a day
            last_reminder = parse_date(last_reminder_str)
            if last_reminder and (now - last_reminder).total_seconds() < 86400:
                continue

            workspace = get_workspace(workspace_id)
            if not workspace:
                continue
                
            roadmap = workspace["plan"].get("roadmap", [])
            if current_index >= len(roadmap):
                continue
                
            milestone = roadmap[current_index]
            
            # Simple duration parsing (default to 24h)
            duration_str = str(milestone.get("estimated_duration", milestone.get("duration", "24 hours"))).lower()
            hours_to_wait = 24
            if "hour" in duration_str:
                try:
                    hours_to_wait = int(''.join(filter(str.isdigit, duration_str)))
                except:
                    pass
            elif "day" in duration_str:
                try:
                    hours_to_wait = int(''.join(filter(str.isdigit, duration_str))) * 24
                except:
                    pass
            elif "week" in duration_str:
                try:
                    hours_to_wait = int(''.join(filter(str.isdigit, duration_str))) * 24 * 7
                except:
                    pass
            
            if (now - base_time).total_seconds() > (hours_to_wait * 3600):
                title = milestone.get("milestone", f"Milestone {current_index + 1}")
                msg = (
                    f"⏰ *Reminder*: you should be working on *{title}*.\n\n"
                    f"Reply /done when finished or /status to check in."
                )
                await app.bot.send_message(chat_id=chat_id, text=msg, parse_mode='Markdown')
                update_last_reminder(chat_id)
                logger.info(f"Sent reminder to {chat_id}")
                
        except Exception as e:
            logger.error(f"Error processing reminder for chat {link.get('chat_id')}: {e}")

def start_scheduler(app):
    scheduler = AsyncIOScheduler()
    scheduler.add_job(check_reminders, 'interval', minutes=60, args=[app])
    scheduler.start()
    logger.info("Scheduler started (runs every 60m).")
