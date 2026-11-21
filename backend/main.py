import os

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

import config
import models
from database import engine, SessionLocal
from routers import books, favorites, cart, orders, admin

# jadvallarni yaratish
models.Base.metadata.create_all(bind=engine)
os.makedirs(config.UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="Kitob do'koni")

app.include_router(books.router)
app.include_router(favorites.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(admin.router)

app.mount("/static", StaticFiles(directory=config.FRONTEND_DIR), name="static")
app.mount("/uploads", StaticFiles(directory=config.UPLOAD_DIR), name="uploads")


@app.on_event("startup")
def add_default_categories():
    db = SessionLocal()
    try:
        if db.query(models.Category).count() == 0:
            for name in ["Badiiy adabiyot", "Detektiv", "Tarix", "Biznes", "Bolalar uchun", "Dasturlash"]:
                db.add(models.Category(name=name))
            db.commit()
    finally:
        db.close()


@app.get("/")
def index():
    return FileResponse(os.path.join(config.FRONTEND_DIR, "index.html"))


@app.get("/admin")
def admin_page():
    return FileResponse(os.path.join(config.FRONTEND_DIR, "admin.html"))
