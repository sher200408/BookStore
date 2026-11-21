import os
from dotenv import load_dotenv

load_dotenv()

# loyiha papkasi (backend ning bir daraja tepasi)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/kitob_db")
BOT_TOKEN = os.getenv("BOT_TOKEN", "")
WEBAPP_URL = os.getenv("WEBAPP_URL", "")

# adminlarning telegram id lari, vergul bilan: 12345,67890
ADMIN_IDS = [int(x) for x in os.getenv("ADMIN_IDS", "").split(",") if x.strip()]

# brauzerda test qilish uchun (telegramsiz). Haqiqiy ishga tushirishda 0 qilib qo'yish kerak!
DEBUG_MODE = os.getenv("DEBUG_MODE", "0") == "1"
