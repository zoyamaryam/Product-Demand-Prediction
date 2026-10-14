from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import requests

from app.routers import trends, predictions, recommendations, ai
from app.db import get_db, SalesRecord
from app.config import GEMINI_API_KEY, GEMINI_MODEL, OLLAMA_URL, OLLAMA_MODEL
from app.ml import MODEL_DIR, model_registry, SUPPORTED_CATEGORIES


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Preload and validate all persisted models on startup
    try:
        model_registry.preload_all()
    except Exception:
        pass
    yield


app = FastAPI(
    title="Product Demand & Trend Prediction API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trends.router)
app.include_router(predictions.router)
app.include_router(recommendations.router)
app.include_router(ai.router)



@app.get("/")
def root():
    return {"status": "ok", "message": "Product Demand Prediction API is running"}


@app.get("/api/health")
@app.get("/api/status")
def system_status(db: Session = Depends(get_db)):
    try:
        record_count = db.query(SalesRecord).count()
        distinct_skus = db.query(SalesRecord.sku_id).distinct().count()
        db_ok = True
    except Exception as e:
        record_count = 0
        distinct_skus = 0
        db_ok = False

    categories = SUPPORTED_CATEGORIES
    ml_status = model_registry.get_status()
    trained_status = {m["category"]: m["file_exists"] for m in ml_status["models"]}
    cached_status = {m["category"]: m["cached_in_memory"] for m in ml_status["models"]}

    ai_provider = "DemandIQ Analytics Engine"
    if GEMINI_API_KEY:
        ai_provider = f"Google Gemini ({GEMINI_MODEL})"
    else:
        try:
            r = requests.get(OLLAMA_URL.replace("/api/generate", "/api/tags"), timeout=0.8)
            if r.status_code == 200:
                ai_provider = f"Ollama ({OLLAMA_MODEL})"
        except Exception:
            pass

    return {
        "status": "ok" if db_ok else "degraded",
        "service": "DemandIQ Retail Intelligence API",
        "version": "2.0.0",
        "database": {
            "connected": db_ok,
            "records": record_count,
            "products_count": distinct_skus,
            "categories": categories,
            "active_cycle": "2024-12",
        },
        "ml": {
            "engine": "XGBoost Regressors",
            "model_version": "2.0.0",
            "all_trained": all(trained_status.values()),
            "models": trained_status,
            "cached": cached_status,
        },
        "ai": {
            "active_provider": ai_provider,
            "gemini_available": bool(GEMINI_API_KEY),
            "ollama_url": OLLAMA_URL,
        },
    }

