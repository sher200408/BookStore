import hmac
import hashlib
import json
from urllib.parse import parse_qsl

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

import config
import models
from database import get_db


def check_init_data(init_data: str):
    """Telegram yuborgan initData ni tekshiradi. To'g'ri bo'lsa user dict qaytaradi."""
    if not init_data or not config.BOT_TOKEN:
        return None

    parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    got_hash = parsed.pop("hash", None)
    if not got_hash:
        return None

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()))
    secret_key = hmac.new(b"WebAppData", config.BOT_TOKEN.encode(), hashlib.sha256).digest()
    my_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(my_hash, got_hash):
        return None

    try:
        return json.loads(parsed.get("user", ""))
    except ValueError:
        return None


def get_current_user(
    x_init_data: str = Header(default=""),
    x_debug_user: str = Header(default=""),
    db: Session = Depends(get_db),
):
    tg_user = check_init_data(x_init_data)

    # telegramsiz, faqat test uchun
    if tg_user is None and config.DEBUG_MODE and x_debug_user.isdigit():
        tg_user = {"id": int(x_debug_user), "first_name": "Test user", "username": "test"}

    if tg_user is None:
        raise HTTPException(status_code=401, detail="Telegram orqali kiring")

    user = db.query(models.User).filter(models.User.telegram_id == tg_user["id"]).first()
    if user is None:
        user = models.User(
            telegram_id=tg_user["id"],
            first_name=tg_user.get("first_name", ""),
            username=tg_user.get("username", ""),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def get_admin(user: models.User = Depends(get_current_user)):
    if user.telegram_id not in config.ADMIN_IDS:
        raise HTTPException(status_code=403, detail="Siz admin emassiz")
    return user
