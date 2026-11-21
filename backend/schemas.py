from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class CategoryCreate(BaseModel):
    name: str


class BookOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    author: str
    description: Optional[str] = None
    price: int
    stock: int
    image_url: Optional[str] = None
    category_id: Optional[int] = None
    category: Optional[CategoryOut] = None


class CartAdd(BaseModel):
    book_id: int
    quantity: int = 1


class CartUpdate(BaseModel):
    quantity: int


class CartItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    quantity: int
    book: BookOut


class CartOut(BaseModel):
    items: List[CartItemOut]
    total: int


class OrderCreate(BaseModel):
    phone: str
    address: str


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    book_id: Optional[int] = None
    title: str
    price: int
    quantity: int


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    phone: str
    address: str
    total: int
    status: str
    created_at: datetime
    items: List[OrderItemOut]


class StatusUpdate(BaseModel):
    status: str
