import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

import config
import models
from auth import get_admin
from database import get_db
from schemas import BookOut, CategoryCreate, CategoryOut, OrderOut, StatusUpdate

router = APIRouter(prefix="/api/admin", tags=["admin"])


def save_image(file: Optional[UploadFile]):
    if file is None or not file.filename:
        return None

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Faqat jpg, png yoki webp rasm yuklash mumkin")

    name = uuid.uuid4().hex + ext
    path = os.path.join(config.UPLOAD_DIR, name)
    with open(path, "wb") as f:
        f.write(file.file.read())
    return "/uploads/" + name


def delete_image(image_url):
    if image_url and image_url.startswith("/uploads/"):
        path = os.path.join(config.UPLOAD_DIR, os.path.basename(image_url))
        if os.path.exists(path):
            os.remove(path)


@router.get("/check")
def check_admin(admin: models.User = Depends(get_admin)):
    return {"ok": True, "name": admin.first_name}


# ---------- kitoblar ----------

@router.post("/books", response_model=BookOut)
def add_book(
    title: str = Form(...),
    author: str = Form(...),
    description: str = Form(""),
    price: int = Form(...),
    stock: int = Form(0),
    category_id: Optional[int] = Form(None),
    image: Optional[UploadFile] = File(None),
    admin: models.User = Depends(get_admin),
    db: Session = Depends(get_db),
):
    if price < 0 or stock < 0:
        raise HTTPException(status_code=400, detail="Narx va soni manfiy bo'lmasligi kerak")

    book = models.Book(
        title=title.strip(),
        author=author.strip(),
        description=description.strip(),
        price=price,
        stock=stock,
        category_id=category_id,
        image_url=save_image(image),
    )
    db.add(book)
    db.commit()
    db.refresh(book)
    return book


@router.put("/books/{book_id}", response_model=BookOut)
def edit_book(
    book_id: int,
    title: str = Form(...),
    author: str = Form(...),
    description: str = Form(""),
    price: int = Form(...),
    stock: int = Form(0),
    category_id: Optional[int] = Form(None),
    image: Optional[UploadFile] = File(None),
    admin: models.User = Depends(get_admin),
    db: Session = Depends(get_db),
):
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Kitob topilmadi")

    if price < 0 or stock < 0:
        raise HTTPException(status_code=400, detail="Narx va soni manfiy bo'lmasligi kerak")

    new_image = save_image(image)
    if new_image:
        delete_image(book.image_url)
        book.image_url = new_image

    book.title = title.strip()
    book.author = author.strip()
    book.description = description.strip()
    book.price = price
    book.stock = stock
    book.category_id = category_id
    db.commit()
    db.refresh(book)
    return book


@router.delete("/books/{book_id}")
def delete_book(book_id: int, admin: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Kitob topilmadi")

    delete_image(book.image_url)
    db.delete(book)
    db.commit()
    return {"ok": True}


# ---------- kategoriyalar ----------

@router.post("/categories", response_model=CategoryOut)
def add_category(data: CategoryCreate, admin: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Kategoriya nomini kiriting")

    exists = db.query(models.Category).filter(func.lower(models.Category.name) == name.lower()).first()
    if exists:
        raise HTTPException(status_code=400, detail="Bunday kategoriya bor")

    category = models.Category(name=name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}")
def delete_category(category_id: int, admin: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Kategoriya topilmadi")

    db.delete(category)
    db.commit()
    return {"ok": True}


# ---------- buyurtmalar ----------

@router.get("/orders")
def all_orders(admin: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    orders = db.query(models.Order).order_by(models.Order.id.desc()).all()
    result = []
    for o in orders:
        data = OrderOut.model_validate(o).model_dump(mode="json")
        data["user_name"] = o.user.first_name
        data["username"] = o.user.username
        result.append(data)
    return result


@router.put("/orders/{order_id}/status")
def change_status(order_id: int, data: StatusUpdate, admin: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    if data.status not in models.ORDER_STATUSES:
        raise HTTPException(status_code=400, detail="Noto'g'ri status")

    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Buyurtma topilmadi")

    old_status = order.status

    # bekor qilinsa kitoblarni omborga qaytaramiz
    if data.status == "bekor qilindi" and old_status != "bekor qilindi":
        for item in order.items:
            book = db.query(models.Book).filter(models.Book.id == item.book_id).first()
            if book:
                book.stock += item.quantity
    # bekor qilingan buyurtma qayta tiklansa, yana ayiramiz
    elif old_status == "bekor qilindi" and data.status != "bekor qilindi":
        for item in order.items:
            book = db.query(models.Book).filter(models.Book.id == item.book_id).first()
            if book:
                book.stock = max(0, book.stock - item.quantity)

    order.status = data.status
    db.commit()
    return {"ok": True, "status": order.status}


# ---------- statistika ----------

@router.get("/stats")
def stats(admin: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    revenue = db.query(func.coalesce(func.sum(models.Order.total), 0)).filter(
        models.Order.status != "bekor qilindi"
    ).scalar()

    return {
        "books": db.query(models.Book).count(),
        "users": db.query(models.User).count(),
        "orders": db.query(models.Order).count(),
        "new_orders": db.query(models.Order).filter(models.Order.status == "yangi").count(),
        "revenue": int(revenue),
    }
