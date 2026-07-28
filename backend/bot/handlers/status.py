from telegram import Update
from telegram.ext import ContextTypes
from db import get_telegram_link, get_workspace

async def status_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    link = get_telegram_link(chat_id)

    if not link:
        await context.bot.send_message(
            chat_id=chat_id, 
            text="Connect your project first — open your dashboard and tap 'Connect Telegram'."
        )
        return

    workspace = get_workspace(link["workspace_id"])
    if not workspace:
        await context.bot.send_message(
            chat_id=chat_id, 
            text="Error: Could not find the linked workspace data."
        )
        return

    current_index = link["current_milestone_index"]
    roadmap = workspace["plan"].get("roadmap", [])

    if current_index >= len(roadmap):
        await context.bot.send_message(
            chat_id=chat_id, 
            text="🎉 You have completed all milestones for this project!"
        )
        return

    milestone = roadmap[current_index]
    milestone_title = milestone.get("milestone", f"Milestone {current_index + 1}")
    tasks = milestone.get("tasks", [])
    formatted_tasks = []
    for t in tasks:
        if isinstance(t, dict):
            task_str = f"*{t.get('title')}*: {t.get('description')}"
            if t.get('rationale'):
                task_str += f"\n    _Rationale: {t.get('rationale')}_"
            formatted_tasks.append(task_str)
        else:
            formatted_tasks.append(str(t))
    
    tasks_text = "\n".join([f"• {t}" for t in formatted_tasks]) if formatted_tasks else "No specific tasks listed."
    remaining = len(roadmap) - current_index - 1

    msg = (
        f"📍 *Current Milestone ({current_index + 1}/{len(roadmap)})*\n"
        f"*{milestone_title}*\n\n"
        f"*Checklist:*\n{tasks_text}\n\n"
        f"_(Reply /done when you have completed this)_"
    )
    
    if remaining > 0:
        msg += f"\n\n_({remaining} milestone(s) remaining after this)_"

    await context.bot.send_message(chat_id=chat_id, text=msg, parse_mode='Markdown')
