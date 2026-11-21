import os

import telebot
from telebot import types
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = os.getenv("WEBAPP_URL")  # https://.... (https bo'lishi shart)
ADMIN_IDS = [int(x) for x in os.getenv("ADMIN_IDS", "").split(",") if x.strip()]

bot = telebot.TeleBot(BOT_TOKEN)


@bot.message_handler(commands=["start"])
def start(message):
    markup = types.InlineKeyboardMarkup()
    markup.add(types.InlineKeyboardButton(
        "📚 Do'konni ochish",
        web_app=types.WebAppInfo(url=WEBAPP_URL),
    ))

    # admin bo'lsa admin panel tugmasi ham chiqadi
    if message.from_user.id in ADMIN_IDS:
        markup.add(types.InlineKeyboardButton(
            "⚙️ Admin panel",
            web_app=types.WebAppInfo(url=WEBAPP_URL.rstrip("/") + "/admin"),
        ))
    
    bot.send_message(
        message.chat.id,
        f"Salom, {message.from_user.first_name}! Kitob do'koniga xush kelibsiz.",
        reply_markup=markup,
    )


print("Bot ishga tushdi...")
bot.infinity_polling()
