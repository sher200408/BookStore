# Kitob do'koni (Telegram Web App)

Kitob sotib olish ilovasi. Backend - Python (FastAPI), baza - PostgreSQL, frontend - oddiy HTML/CSS/JS.

## Imkoniyatlar

Foydalanuvchi uchun:
- kitoblar katalogi, qidiruv va kategoriya bo'yicha filtr
- kitob haqida batafsil ma'lumot
- sevimlilar
- savatcha (sonini o'zgartirish, o'chirish)
- buyurtma berish va buyurtmalar tarixi

Admin uchun (`/admin`):
- kitob qo'shish, tahrirlash, o'chirish (rasm bilan)
- kategoriyalar
- buyurtmalarni ko'rish va statusini o'zgartirish
- statistika
- yangi buyurtma kelganda telegramga xabar keladi

## Papkalar

```
kitob_ilova/
  backend/
    main.py          - asosiy fayl
    config.py        - sozlamalar
    database.py      - baza ulanishi
    models.py        - jadvallar
    schemas.py       - pydantic sxemalar
    auth.py          - telegram orqali kirish
    routers/         - books, favorites, cart, orders, admin
  frontend/          - index.html, admin.html, js va css
  uploads/           - yuklangan rasmlar
  bot.py             - telegram bot
```

## Ishga tushirish

1. PostgreSQL da baza yaratish:

```
CREATE DATABASE kitob_db;
```

2. Kutubxonalarni o'rnatish:

```
python -m venv venv
venv\Scripts\activate        (Linux/Mac: source venv/bin/activate)
pip install -r requirements.txt
```

3. `.env.example` faylidan `.env` nusxa olib, ichini to'ldirish:
   - `BOT_TOKEN` - @BotFather dan olinadi
   - `ADMIN_IDS` - o'zingizning telegram id ingiz (@userinfobot orqali bilib olasiz)
   - `DATABASE_URL` - baza paroli va nomi
   - `WEBAPP_URL` - pastdagi 5-qadamdan keyin yoziladi

4. Serverni ishga tushirish (backend papkasi ichida):

```
cd backend
uvicorn main:app --reload
```

Jadvallar avtomatik yaratiladi. Dastlabki kategoriyalar ham o'zi qo'shiladi.

5. Telegram Web App faqat `https` bilan ishlaydi, shuning uchun lokal serverni ngrok orqali ochamiz:

```
ngrok http 8000
```

Chiqqan `https://...` manzilni `.env` dagi `WEBAPP_URL` ga yozing.

6. Botni ishga tushirish (alohida terminalda, asosiy papkada):

```
python bot.py
```

Botga `/start` yozsangiz tugma chiqadi. Admin bo'lsangiz "Admin panel" tugmasi ham chiqadi.

## Brauzerda test qilish

`.env` da `DEBUG_MODE=1` qilib, `http://localhost:8000` ni brauzerda ochsangiz telegramsiz ishlaydi
(test user id = 1001). Admin panelni tekshirish uchun `ADMIN_IDS=1001` qiling.
Loyihani topshirishdan oldin `DEBUG_MODE=0` qilib qo'yish kerak!

## API (qisqacha)

| Metod | Manzil | Vazifasi |
|-------|--------|----------|
| GET | /api/books | kitoblar ro'yxati (search, category_id) |
| GET | /api/categories | kategoriyalar |
| GET/POST | /api/favorites | sevimlilar / qo'shish-o'chirish |
| GET/POST | /api/cart | savatcha |
| PUT/DELETE | /api/cart/{book_id} | sonini o'zgartirish / o'chirish |
| GET/POST | /api/orders | buyurtmalarim / buyurtma berish |
| * | /api/admin/... | faqat adminlar uchun |

Swagger hujjat: `http://localhost:8000/docs`
