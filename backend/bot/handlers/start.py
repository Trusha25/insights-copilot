from telegram import Update
from telegram.ext import ContextTypes
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from db import link_telegram, get_workspace

async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    args = context.args

    if not args:
        await context.bot.send_message(
            chat_id=chat_id, 
            text="Connect your project first — open your dashboard and tap 'Connect Telegram'."
        )
        return

    workspace_id = args[0]
    workspace = get_workspace(workspace_id)

    if not workspace:
        await context.bot.send_message(
            chat_id=chat_id, 
            text="Sorry, I couldn't find that project. Please open your dashboard and try connecting again."
        )
        return

    # Link the chat to the workspace
    link_telegram(chat_id, workspace_id)

    idea_name = workspace["idea"]
    welcome_text = (
        f"✅ Successfully linked to your project:\n"
        f"*{idea_name}*\n\n"
        f"I'll be tracking your progress and sending reminders. Here's what you can do:\n"
        f"/status - Check your current milestone\n"
        f"/done - Mark your current milestone as complete\n"
        f"Or just send me any question about your project and I'll ask the AI mentor!"
    )

    await context.bot.send_message(
        chat_id=chat_id, 
        text=welcome_text,
        parse_mode='Markdown'
    )
