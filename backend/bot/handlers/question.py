from telegram import Update
from telegram.ext import ContextTypes
import sys
import os
import httpx
import logging

logger = logging.getLogger(__name__)

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from db import get_telegram_link, get_workspace

async def question_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    text = update.message.text
    
    link = get_telegram_link(chat_id)
    if not link:
        await context.bot.send_message(
            chat_id=chat_id, 
            text="Connect your project first — open your dashboard and tap 'Connect Telegram'."
        )
        return

    workspace = get_workspace(link["workspace_id"])
    if not workspace:
        await context.bot.send_message(chat_id=chat_id, text="Error: Workspace not found.")
        return

    # Inform user we are thinking
    processing_msg = await context.bot.send_message(chat_id=chat_id, text="🤔 Let me think about that...")

    payload = {
        "idea": workspace["idea"],
        "research": workspace["research"],
        "plan": workspace["plan"],
        "question": text
    }

    try:
        async with httpx.AsyncClient() as client:
            # We call the local API server directly
            response = await client.post("http://localhost:8000/api/mentor", json=payload, timeout=60.0)
            response.raise_for_status()
            data = response.json()
            
            answer = data.get("answer", "I couldn't generate an answer.")
            resources = data.get("learning_resources", [])
            
            final_msg = answer
            if resources:
                final_msg += "\n\n*Helpful Resources:*\n"
                for res in resources:
                    final_msg += f"• [{res.get('title', 'Link')}]({res.get('url', '')})\n"

            await context.bot.edit_message_text(
                chat_id=chat_id,
                message_id=processing_msg.message_id,
                text=final_msg,
                parse_mode='Markdown'
            )
            
    except Exception as e:
        logger.error(f"Mentor API call failed: {e}")
        await context.bot.edit_message_text(
            chat_id=chat_id,
            message_id=processing_msg.message_id,
            text="Sorry, I couldn't process that right now — try again in a moment."
        )
