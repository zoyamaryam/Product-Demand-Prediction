import math
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.ml import (
    train_all_models,
    predict_next_month,
    predict_all_categories,
    get_all_model_metrics,
    get_model_benchmark,
    FEATURE_SCHEMA,
    predict_custom,
    predict_batch,
    get_category_defaults,
    model_registry,
    CategoryNotFoundError,
    ModelNotFoundError,
    ModelCorruptedError,
)
from app.schemas import (
    ValidatedCustomPredictionRequest,
    CustomPredictionResponse,
    NextMonthPredictionResponse,
    BatchPredictionRequest,
    BatchPredictionResponse,
    ModelStatusResponse,
)

# Backward-compatible alias for existing tests and consumers
CustomPredictionRequest = ValidatedCustomPredictionRequest

router = APIRouter(prefix="/api", tags=["predictions"])


@router.post(
    "/train",
    summary="Train and serialize category forecasting models",
    description="Synchronously retrains XGBoost regressors and evaluates baselines across all supported categories, serializing models to disk."
)
def train_models(db: Session = Depends(get_db)):
    try:
        results = train_all_models(db)
        return {"status": "success", "results": results}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Training failure: {str(e)}")


@router.get(
    "/metrics",
    summary="Retrieve model evaluation metrics and validation curves",
    description="Returns chronological hold-out validation metrics (MAE, RMSE, MAPE, WAPE) and baseline comparisons for all categories."
)
def get_metrics(db: Session = Depends(get_db)):
    try:
        return get_all_model_metrics(db)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error retrieving metrics: {str(e)}")


@router.get(
    "/ml/benchmark",
    summary="Cross-category model benchmark scorecard",
    description="Returns cross-category performance comparisons between XGBoost and baselines (Naive, Seasonal-Naive, 3-Month Moving Average)."
)
def get_benchmark(db: Session = Depends(get_db)):
    try:
        return get_model_benchmark(db)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error generating benchmark: {str(e)}")


@router.get(
    "/ml/feature-schema",
    summary="Inspect model feature dictionary and leakage audit",
    description="Returns the formal production feature schema contract, data types, and leakage prevention specifications."
)
def get_feature_schema():
    return FEATURE_SCHEMA


@router.get(
    "/ml/status",
    response_model=ModelStatusResponse,
    summary="Inspect persisted model registry status",
    description="Returns memory cache and disk presence status, model versions, and residual calibration error for each category."
)
@router.get(
    "/models",
    response_model=ModelStatusResponse,
    include_in_schema=False
)
def get_model_status():
    return model_registry.get_status()


@router.get(
    "/predict/defaults/{category}",
    summary="Fetch recommended scenario simulation inputs",
    description="Returns baseline inputs (price, promo days, historical lags) for scenario simulation based on the latest records for the category."
)
def get_defaults(
    category: str = Path(..., description="Target product category (Beauty, Clothing, Electronics, Home)"),
    db: Session = Depends(get_db)
):
    try:
        return get_category_defaults(db, category)
    except CategoryNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/predict/custom",
    response_model=CustomPredictionResponse,
    summary="Simulate demand forecast and inventory recommendation",
    description="Executes persisted XGBoost model inference using user-provided commercial features and historical lags."
)
def predict_custom_endpoint(
    request: ValidatedCustomPredictionRequest,
    db: Session = Depends(get_db)
):
    try:
        return predict_custom(
            db=db,
            category=request.category,
            month_num=request.month_num,
            avg_price=request.avg_price,
            promo_days=request.promo_days,
            holiday_days=request.holiday_days,
            lag1=request.lag1,
            lag2=request.lag2,
            rolling3=request.rolling3,
            current_inventory=request.current_inventory,
            request_id=request.request_id,
        )
    except CategoryNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ModelNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except ModelCorruptedError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/predict/batch",
    response_model=BatchPredictionResponse,
    summary="Batch demand forecasting across multiple scenario requests",
    description="Processes a batch list of prediction requests with item-level error isolation (partial success supported)."
)
def predict_batch_endpoint(
    request: BatchPredictionRequest,
    db: Session = Depends(get_db)
):
    items = [item.model_dump() for item in request.items]
    return predict_batch(db, items)


@router.get(
    "/predict/{category}",
    response_model=NextMonthPredictionResponse,
    summary="Forecast next-month demand for a single category",
    description="Generates next-month demand forecast and 95% confidence intervals using latest historical data and persisted model."
)
def predict(
    category: str = Path(..., description="Target category (Beauty, Clothing, Electronics, Home)"),
    db: Session = Depends(get_db)
):
    try:
        return predict_next_month(db, category)
    except CategoryNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ModelNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except ModelCorruptedError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/predict",
    response_model=List[NextMonthPredictionResponse],
    summary="Forecast next-month demand for all retail categories",
    description="Generates next-month demand predictions with confidence ranges across all supported retail categories."
)
def predict_all(db: Session = Depends(get_db)):
    try:
        return predict_all_categories(db)
    except ModelNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except ModelCorruptedError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))