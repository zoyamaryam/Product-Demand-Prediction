# DemandIQ 2.0 — Testing & Validation Guide

**Document Version:** 2.0.0  
**Phase:** Phase 8 Prototype Validation  
**Date:** October 2026  
**Status:** Validated  

---

## 1. Overview & Verification Strategy

DemandIQ 2.0 employs a comprehensive multi-tier testing strategy covering:
1. **Mathematical & Domain Invariants:** Verifying revenue consistency, non-negativity, stable SKUs, and synthetic data provenance.
2. **Machine Learning Integrity:** Chronological hold-out evaluation (no random shuffling), feature leakage prevention, baseline comparisons, and model serialization persistence.
3. **Inventory & Business Rules:** Deterministic replenishment policy calculations, lead-time run-rates, safety stock buffers, and non-causal pricing rules.
4. **AI & Assistant Grounding:** Intent resolution, strict absence of hallucinated metrics, non-automated purchase disclaimers, and graceful handling of absent/ambiguous data.
5. **API & End-to-End Contract Parity:** FastAPI endpoint schemas, error response codes (400, 404, 422, 503), category filters, and React frontend production builds.

---

## 2. Test Execution Commands

### 2.1 Backend Automated Pytest Suite
Run from the `backend/` directory within the active virtual environment:

```powershell
# Windows (PowerShell)
cd backend
.\venv\Scripts\python.exe -m pytest tests/ -v --tb=short

# macOS / Linux
cd backend
python -m pytest tests/ -v --tb=short
```

**Expected Result:** **81 passed tests (100% pass rate)**.

### 2.2 Frontend Linter & Static Analysis
Run from the `frontend/` directory:

```bash
cd frontend
npm run lint
```

**Expected Result:** **0 errors, 0 warnings**.

### 2.3 Frontend Production Build
Validate production bundling and tree-shaking:

```bash
cd frontend
npm run build
```

**Expected Result:** Successful Vite build generating route-split chunks (`dist/assets/`) without bundle-size warnings.

---

## 3. Automated Test Suite Breakdown (81 Test Cases)

| Test Module | Test Count | Scope & Invariants Tested |
| :--- | :---: | :--- |
| `tests/test_dataset_validation.py` | 8 | Mathematical integrity ($Revenue = Q \times P \times (1-D)$), non-negativity, zero nulls, 48 consecutive months, stable 20-product catalog, synthetic data flags. |
| `tests/test_analytics.py` | 8 | Descriptive KPIs, category distributions, MoM momentum classification, seasonality index calculations, holiday demand lifts, interactive category/date filtering. |
| `tests/test_ml.py` | 18 | Chronological 80/20 train/test splitting, autoregressive lag feature derivation, leakage barriers, baseline evaluations (Naive, Seasonal Naive, MA-3), XGBoost serialization integrity, cache management. |
| `tests/test_recommendations.py` | 2 | Legacy recommendation compatibility, inventory snapshot aggregations. |
| `tests/test_inventory_and_pricing.py` | 7 | Replenishment formulas ($Target - Stock$), lead-time demand ($D \times L / 30$), stockout and surplus classification, empirical elasticity, non-causal pricing disclaimers. |
| `tests/test_ai.py` | 3 | Backward-compatible analytical briefing generator, deterministic Q&A fallback methods. |
| `tests/test_ai_insights_and_assistant.py` | 19 | Structured insight schema fields, contradiction prevention, 6 canonical business questions, unavailable data rejections, ambiguous query handling, automated order prevention, non-causal pricing assertions, offline LLM fallback. |
| `tests/test_api_endpoints.py` | 16 | FastAPI HTTP routes, status endpoints, batch inference, custom prediction schema validation (422), missing model rejection (503), category 404s, CORS headers. |

---

## 4. Manual API Verification Checklist

For manual verification via `curl`, HTTPie, or Postman against a running server (`http://127.0.0.1:8000`):

### 1. Health & Status
```bash
curl -X GET http://127.0.0.1:8000/api/status
```
- Verify `"status": "ok"`
- Verify `"database.records": 8048`
- Verify `"database.active_cycle": "2024-12"`
- Verify `"ml.all_trained": true`

### 2. Model Benchmarks
```bash
curl -X GET http://127.0.0.1:8000/api/ml/benchmark
```
- Verify presence of Naive, Seasonal Naive, Moving Average (3-Month), and XGBoost metrics.
- Confirm Beauty category notes MA-3 lower error.

### 3. Inventory Intelligence
```bash
curl -X GET "http://127.0.0.1:8000/api/inventory/intelligence?category=Clothing"
```
- Verify `"stockout_risk"` matches warehouse position.
- Verify `"suggested_replenishment_qty"` calculation.
- Verify `"forecast_period": "2025-01 (Historical Prototype)"`.

### 4. Pricing Insights
```bash
curl -X GET "http://127.0.0.1:8000/api/pricing/insights?category=Clothing"
```
- Verify `"price_elasticity"` value.
- Confirm presence of non-causal and missing-cost disclaimer: `"limitations": ["Wholesale unit costs and profit margins are absent..."]`.

### 5. Structured Insights
```bash
curl -X GET http://127.0.0.1:8000/api/insights/structured
```
- Verify all insights have `id`, `category`, `severity`, `supporting_metrics`, and `recommendation`.
- Confirm no duplicate or contradictory items.

### 6. Conversational Assistant
```bash
curl -X POST http://127.0.0.1:8000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Which categories show the greatest inventory risk?"}'
```
- Confirm response contains `"intent": "inventory_risk"`.
- Confirm response explicitly states `"automated purchasing is disabled"`.

---

## 5. Known Testing Gaps & Prototype Boundaries

1. **Synthetic Data Nature:** All tests operate on the deterministic synthetic retail dataset (`seed=42`). Performance metrics do not reflect real-world consumer behavior or unpredictable supply chain disruptions.
2. **Offline LLM Integration:** If external LLM credentials (Google Gemini) or local services (Ollama) are unavailable, tests verify that the deterministic analytics engine functions seamlessly. Tests do not mandate paid external API tokens.
3. **Single Planning Horizon:** Multi-month recursive forecasting is deliberately excluded to prevent compounding prediction errors.
4. **No Real Procurement Execution:** Tests verify that orders are *never* executed automatically, maintaining safety in prototype environments.
