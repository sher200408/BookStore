from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db
from schemas import CartAdd, CartUpdate, CartOut

router = APIRouter(prefix="/api/cart", tags=["cart"])


def get_cart_data(user, db):
    items = db.query(models.CartItem).filter(models.CartItem.user_id == user.id).order_by(models.CartItem.id).all()
    total = 0
    for item in items:
        total += item.book.price * item.quantity
    return {"items": items, "total": total}


@router.get("", response_model=CartOut)
def get_cart(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_cart_data(user, db)


@router.post("", response_model=CartOut)
def add_to_cart(data: CartAdd, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    book = db.query(models.Book).filter(models.Book.id == data.book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Kitob topilmadi")

    if data.quantity < 1:
        raise HTTPException(status_code=400, detail="Soni noto'g'ri")

    item = db.query(models.CartItem).filter(
        models.CartItem.user_id == user.id,
        models.CartItem.book_id == data.book_id,
    ).first()

    new_qty = data.quantity + (item.quantity if item else 0)
    if new_qty > book.stock:
        raise HTTPException(status_code=400, detail=f"Omborda faqat {book.stock} dona bor")

    if item:
        item.quantity = new_qty
    else:
        db.add(models.CartItem(user_id=user.id, book_id=data.book_id, quantity=new_qty))
    db.commit()

    return get_cart_data(user, db)


@router.put("/{book_id}", response_model=CartOut)
def update_cart(book_id: int, data: CartUpdate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(models.CartItem).filter(
        models.CartItem.user_id == user.id,
        models.CartItem.book_id == book_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Savatchada bunday kitob yo'q")

    if data.quantity <= 0:
        db.delete(item)
    else:
        if data.quantity > item.book.stock:
            raise HTTPException(status_code=400, detail=f"Omborda faqat {item.book.stock} dona bor")
        item.quantity = data.quantity
    db.commit()

    return get_cart_data(user, db)


@router.delete("/{book_id}", response_model=CartOut)
def remove_from_cart(book_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(models.CartItem).filter(
        models.CartItem.user_id == user.id,
        models.CartItem.book_id == book_id,
    ).first()
    if item:
        db.delete(item)
        db.commit()

    return get_cart_data(user, db)
