from typing import List

import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import config
import models
from auth import get_current_user
from database import get_db
from schemas import OrderCreate, OrderOut

router = APIRouter(prefix="/api/orders", tags=["orders"])


def notify_admins(order, user):
    """Yangi buyurtma haqida adminlarga telegramdan xabar yuboradi"""
    if not config.BOT_TOKEN:
        return

    text = f"Yangi buyurtma #{order.id}\n"
    text += f"Mijoz: {user.first_name}\n"
    text += f"Telefon: {order.phone}\n"
    text += f"Manzil: {order.address}\n\n"
    for item in order.items:
        text += f"- {item.title} x{item.quantity}\n"
    text += f"\nJami: {order.total} so'm"

    for admin_id in config.ADMIN_IDS:
        try:
            requests.post(
                f"https://api.telegram.org/bot{config.BOT_TOKEN}/sendMessage",
                json={"chat_id": admin_id, "text": text},
                timeout=5,
            )
        except Exception as e:
            print("Adminga xabar yuborib bo'lmadi:", e)


@router.post("", response_model=OrderOut)
def create_order(data: OrderCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    phone = data.phone.strip()
    address = data.address.strip()
    if len(phone) < 7 or len(address) < 5:
        raise HTTPException(status_code=400, detail="Telefon raqam va manzilni to'g'ri kiriting")

    cart_items = db.query(models.CartItem).filter(models.CartItem.user_id == user.id).all()
    if not cart_items:
        raise HTTPException(status_code=400, detail="Savatcha bo'sh")

    # avval hammasini tekshirib olamiz
    for item in cart_items:
        if item.quantity > item.book.stock:
            raise HTTPException(
                status_code=400,
                detail=f"'{item.book.title}' kitobidan omborda faqat {item.book.stock} dona qolgan",
            )

    order = models.Order(user_id=user.id, phone=phone, address=address, status="yangi")
    total = 0
    for item in cart_items:
        order.items.append(models.OrderItem(
            book_id=item.book_id,
            title=item.book.title,
            price=item.book.price,
            quantity=item.quantity,
        ))
        total += item.book.price * item.quantity
        item.book.stock -= item.quantity
        db.delete(item)

    order.total = total
    db.add(order)
    db.commit()
    db.refresh(order)

    notify_admins(order, user)
    return order


@router.get("", response_model=List[OrderOut])
def my_orders(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Order).filter(models.Order.user_id == user.id).order_by(models.Order.id.desc()).all()
