from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import get_db
from app.analytics import (
    get_trending_products,
    get_category_trends,
    get_seasonality,
    get_executive_summary,
    get_diagnostic_analytics,
)

router = APIRouter(prefix="/api", tags=["trends"])


@router.get("/summary")
def summary(
    db: Session = Depends(get_db),
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    return get_executive_summary(db, category=category, start_date=start_date, end_date=end_date)


@router.get("/trends/products")
def trending_products(
    db: Session = Depends(get_db),
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    return get_trending_products(db, category=category, start_date=start_date, end_date=end_date)


@router.get("/trends/categories")
def category_trends(
    db: Session = Depends(get_db),
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    return get_category_trends(db, category=category, start_date=start_date, end_date=end_date)


@router.get("/seasonality")
def seasonality(
    db: Session = Depends(get_db),
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    return get_seasonality(db, category=category, start_date=start_date, end_date=end_date)


@router.get("/diagnostics")
def diagnostics(
    db: Session = Depends(get_db),
    category: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    return get_diagnostic_analytics(db, category=category, start_date=start_date, end_date=end_date)