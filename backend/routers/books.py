from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

import models
from database import get_db
from schemas import BookOut, CategoryOut

router = APIRouter(prefix="/api", tags=["books"])


@router.get("/categories", response_model=List[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).order_by(models.Category.name).all()


@router.get("/books", response_model=List[BookOut])
def get_books(search: str = "", category_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.Book)

    if search:
        like = f"%{search}%"
        query = query.filter(or_(models.Book.title.ilike(like), models.Book.author.ilike(like)))

    if category_id:
        query = query.filter(models.Book.category_id == category_id)

    return query.order_by(models.Book.id.desc()).all()


@router.get("/books/{book_id}", response_model=BookOut)
def get_book(book_id: int, db: Session = Depends(get_db)):
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Kitob topilmadi")
    return book
