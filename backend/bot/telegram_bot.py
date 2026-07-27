import os
import sys
import logging
from dotenv import load_dotenv
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters

# Add backend directory to sys.path to allow importing db
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from handlers.start import start_handler
from handlers.status import status_handler
from handlers.done import done_handler
from handlers.question import question_handler
from scheduler import start_scheduler

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

async def post_init(application):
    """Called after the event loop is running — safe to start the scheduler here."""
    start_scheduler(application)

def main():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token or token == "your_telegram_bot_token":
        logger.error("TELEGRAM_BOT_TOKEN is missing or not configured in .env")
        sys.exit(1)

    app = ApplicationBuilder().token(token).post_init(post_init).build()

    # Register handlers
    app.add_handler(CommandHandler("start", start_handler))
    app.add_handler(CommandHandler("status", status_handler))
    app.add_handler(CommandHandler("done", done_handler))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, question_handler))

    logger.info("Starting Telegram Bot (Polling Mode)...")
    app.run_polling()

if __name__ == '__main__':
    main()
