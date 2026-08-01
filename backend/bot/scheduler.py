from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import logging
from datetime import datetime, timedelta
from db import get_all_telegram_links, get_workspace, get_workspaces_for_user, update_last_reminder

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

async def weekly_digest(app):
    logger.info("Running weekly digest scheduler check...")
    links = get_all_telegram_links()
    if not links:
        return

    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)

    # Group by chat_id to ensure 1 digest message per linked Telegram chat/user
    chat_links = {}
    for link in links:
        chat_id = link.get("chat_id")
        if chat_id and chat_id not in chat_links:
            chat_links[chat_id] = link

    for chat_id, link in chat_links.items():
        try:
            workspace_id = link.get("workspace_id")
            if not workspace_id:
                continue

            main_workspace = get_workspace(workspace_id)
            if not main_workspace:
                logger.warning(f"Workspace {workspace_id} missing for chat {chat_id}, skipping digest.")
                continue

            user_id = main_workspace.get("user_id")
            
            # Aggregate across all of user's workspaces if user_id exists, otherwise fallback to main workspace
            if user_id:
                raw_workspaces = get_workspaces_for_user(user_id)
                workspaces_data = []
                for row in raw_workspaces:
                    workspaces_data.append({
                        "id": row.get("id"),
                        "idea": row.get("idea"),
                        "research": row.get("research_json", {}),
                        "plan": row.get("plan_json", {}),
                        "created_at": row.get("created_at")
                    })
            else:
                workspaces_data = [main_workspace]

            new_ideas_count = 0
            total_score_sum = 0
            scored_count = 0
            milestones_completed_count = 0

            for ws in workspaces_data:
                # Count ideas created in the last 7 days
                created_at_str = ws.get("created_at")
                created_at = parse_date(created_at_str)
                if created_at and created_at >= seven_days_ago:
                    new_ideas_count += 1

                # Calculate average startup_score
                research = ws.get("research") if isinstance(ws.get("research"), dict) else {}
                score = research.get("startup_score") or research.get("score")
                if score is not None:
                    try:
                        total_score_sum += float(score)
                        scored_count += 1
                    except (ValueError, TypeError):
                        pass

                # Count milestones completed in the last 7 days
                plan = ws.get("plan") if isinstance(ws.get("plan"), dict) else {}
                roadmap = plan.get("roadmap", []) if isinstance(plan, dict) else []
                for m in roadmap:
                    completed_at_str = m.get("completed_at")
                    if completed_at_str:
                        completed_at = parse_date(completed_at_str)
                        if completed_at and completed_at >= seven_days_ago:
                            milestones_completed_count += 1

            # Skip condition: If zero new ideas AND zero completed milestones in last 7 days, do not send
            if new_ideas_count == 0 and milestones_completed_count == 0:
                logger.info(f"Skipping weekly digest for chat {chat_id}: zero activity in last 7 days.")
                continue

            avg_score_str = f"{round(total_score_sum / scored_count, 1)}" if scored_count > 0 else "0"

            msg = f"This week: {new_ideas_count} ideas analyzed, avg score {avg_score_str}, {milestones_completed_count} milestones completed."
            await app.bot.send_message(chat_id=chat_id, text=msg)
            logger.info(f"Sent weekly digest to {chat_id}")

        except Exception as e:
            logger.error(f"Error processing weekly digest for chat {chat_id}: {e}")

def start_scheduler(app):
    scheduler = AsyncIOScheduler()
    scheduler.add_job(check_reminders, 'interval', minutes=60, args=[app])
    scheduler.add_job(
        weekly_digest,
        CronTrigger(day_of_week='mon', hour=9, minute=0),
        args=[app],
        id='weekly_digest',
        replace_existing=True
    )
    scheduler.start()
    logger.info("Scheduler started (runs check_reminders every 60m & weekly_digest every Mon at 09:00 UTC).")
