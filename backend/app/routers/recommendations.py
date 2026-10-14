from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import get_db
from app.recommendations import (
    generate_recommendations,
    get_inventory_intelligence,
    get_pricing_insights,
)
from app.analytics import get_product_inventory_status
from app.schemas import InventoryIntelligenceResponse, PricingInsightsResponse

router = APIRouter(prefix="/api", tags=["recommendations"])


@router.get("/recommendations")
def recommendations(db: Session = Depends(get_db)):
    """Return category-level inventory recommendations and stock risk flags."""
    return generate_recommendations(db)


@router.get(
    "/inventory/intelligence",
    response_model=InventoryIntelligenceResponse,
    summary="Get comprehensive inventory intelligence & replenishment recommendations",
    description="Provides projected demand vs available inventory, lead-time demand, suggested replenishment, and safety stock assumptions."
)
def inventory_intelligence(
    db: Session = Depends(get_db),
    category: Optional[str] = None
):
    clean_cat = category if isinstance(category, str) else None
    return get_inventory_intelligence(db, category=clean_cat)


@router.get(
    "/pricing/insights",
    response_model=PricingInsightsResponse,
    summary="Get empirical pricing patterns and markdown review insights",
    description="Provides observed price, discount, and promotional demand patterns, with clearly documented empirical rules and non-causal limitations."
)
def pricing_insights(
    db: Session = Depends(get_db),
    category: Optional[str] = None
):
    clean_cat = category if isinstance(category, str) else None
    return get_pricing_insights(db, category=clean_cat)


@router.get("/inventory/products")
def product_inventory(
    db: Session = Depends(get_db),
    category: Optional[str] = None
):
    """Return latest inventory status snapshot for catalog products."""
    clean_cat = category if isinstance(category, str) else None
    return get_product_inventory_status(db, category=clean_cat)