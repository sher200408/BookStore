from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
from auth import get_current_user
from database import get_db
from schemas import BookOut

router = APIRouter(prefix="/api/favorites", tags=["favorites"])


@router.get("", response_model=List[BookOut])
def my_favorites(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    favs = db.query(models.Favorite).filter(models.Favorite.user_id == user.id).order_by(models.Favorite.id.desc()).all()
    return [f.book for f in favs]


@router.post("/{book_id}")
def toggle_favorite(book_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Sevimlilarda bo'lsa o'chiradi, bo'lmasa qo'shadi"""
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Kitob topilmadi")

    fav = db.query(models.Favorite).filter(
        models.Favorite.user_id == user.id,
        models.Favorite.book_id == book_id,
    ).first()

    if fav:
        db.delete(fav)
        db.commit()
        return {"is_favorite": False}

    db.add(models.Favorite(user_id=user.id, book_id=book_id))
    db.commit()
    return {"is_favorite": True}
