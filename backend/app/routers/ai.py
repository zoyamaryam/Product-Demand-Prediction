from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db import get_db
from app.analytics import (
    get_executive_summary,
    get_category_trends,
    get_trending_products,
    get_seasonality,
)
from app.ml import predict_all_categories
from app.recommendations import generate_recommendations
from app.schemas import (
    StructuredInsightsResponse,
    AskAssistantRequest,
    BusinessAssistantResponse,
)
from app.ai import (
    generate_business_insight,
    get_business_insight_with_meta,
    answer_question,
    answer_question_with_meta,
    generate_structured_insights,
    answer_business_question,
)

# Backward compatibility alias
AskRequest = AskAssistantRequest

router = APIRouter(prefix="/api", tags=["ai"])


@router.get("/insights/structured", response_model=StructuredInsightsResponse)
def structured_insights(
    category: Optional[str] = Query(None, description="Optional category filter"),
    db: Session = Depends(get_db),
):
    """
    Returns structured, evidence-grounded business insights across demand trends,
    seasonality, inventory vulnerabilities, pricing patterns, and model limitations.
    """
    insights_list = generate_structured_insights(db, category=category)
    return {
        "insights": insights_list,
        "total_insights": len(insights_list),
        "active_dataset_cycle": "2024-12 (Data Through)",
        "data_disclaimer": "All insights are derived from verified historical transactions through December 2024. Automated ordering is disabled.",
    }


@router.get("/insights")
def insights(db: Session = Depends(get_db)):
    """
    Executive natural-language briefing synthesized from verified analytics,
    accompanied by structured insight objects.
    """
    summary = get_executive_summary(db)
    category_trends = get_category_trends(db)
    predictions = predict_all_categories(db)
    recommendations = generate_recommendations(db)

    result = get_business_insight_with_meta(summary, category_trends, predictions, recommendations)
    structured = generate_structured_insights(db)

    return {
        "insight": result["insight"],
        "provider": result.get("provider", "DemandIQ Analytics Engine"),
        "structured_insights": structured,
        "active_dataset_cycle": "2024-12 (Data Through)",
        "disclaimer": "All figures derive from verified historical transactions through December 2024.",
    }


@router.post("/ask", response_model=BusinessAssistantResponse)
def ask(request: AskAssistantRequest, db: Session = Depends(get_db)):
    """
    Conversational Business Assistant. Answers user inquiries using verified data,
    computes deterministic evidence, enforces non-causal pricing rules, and isolates advisory reorders.
    """
    result = answer_business_question(request.question, db, category=request.category)
    return result