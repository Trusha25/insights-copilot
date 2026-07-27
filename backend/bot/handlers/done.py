from telegram import Update
from telegram.ext import ContextTypes
from db import get_telegram_link, get_workspace, update_milestone_index

async def done_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
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
        await context.bot.send_message(chat_id=chat_id, text="Error: Could not find linked workspace.")
        return

    current_index = link["current_milestone_index"]
    roadmap = workspace["plan"].get("roadmap", [])

    if current_index >= len(roadmap):
        await context.bot.send_message(chat_id=chat_id, text="You have already completed all milestones!")
        return

    # Increment index
    new_index = current_index + 1
    update_milestone_index(chat_id, new_index)

    if new_index >= len(roadmap):
        await context.bot.send_message(
            chat_id=chat_id, 
            text=f"🎉 *CONGRATULATIONS!* 🎉\n\nYou have completed the final milestone for *{workspace['idea']}*! Great job!",
            parse_mode='Markdown'
        )
    else:
        next_milestone = roadmap[new_index]
        title = next_milestone.get("milestone", f"Milestone {new_index + 1}")
        tasks = next_milestone.get("tasks", [])
        tasks_text = "\n".join([f"• {t}" for t in tasks]) if tasks else "No specific tasks."

        msg = (
            f"✅ *Milestone complete!* Awesome work.\n\n"
            f"Here is your next milestone ({new_index + 1}/{len(roadmap)}):\n"
            f"*{title}*\n\n"
            f"{tasks_text}\n\n"
            f"Reply /status to review this later, or /done when finished."
        )
        await context.bot.send_message(chat_id=chat_id, text=msg, parse_mode='Markdown')
