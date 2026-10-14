# API Reference — DemandIQ Retail Intelligence API

The FastAPI backend exposes a REST API serving analytics, machine learning forecasts, inventory risk calculations, and natural-language AI insights.

## Base URL
- **Local Development:** `http://127.0.0.1:8000/api` (or `http://localhost:8000/api`)

---

## 1. System Health & Infrastructure

### `GET /api/status` (or `GET /api/health`)
Provides live diagnostics on database connectivity, record counts, active demand cycles, model serialization states, and active AI providers.
- **Response:**
  ```json
  {
    "status": "ok",
    "service": "DemandIQ Retail Intelligence API",
    "version": "1.0.0",
    "database": {
      "connected": true,
      "records": 5000,
      "products_count": 50,
      "categories": ["Beauty", "Clothing", "Electronics", "Home"],
      "active_cycle": "2035-08"
    },
    "ml": {
      "engine": "XGBoost Regressors",
      "all_trained": true,
      "models": {
        "Beauty": true,
        "Clothing": true,
        "Electronics": true,
        "Home": true
      }
    },
    "ai": {
      "active_provider": "DemandIQ Analytics Engine",
      "gemini_available": false,
      "ollama_url": "http://localhost:11434/api/generate"
    }
  }
  ```

---

## 2. Analytics, Trend & Diagnostics Endpoints

All analytics endpoints accept optional query parameters for dynamic slicing:
- `category` (string, optional): Slices by sector (`Beauty`, `Clothing`, `Electronics`, `Home`). Default: all categories.
- `start_date` (string, optional): Inclusive start date filter in `YYYY-MM-DD` format.
- `end_date` (string, optional): Inclusive end date filter in `YYYY-MM-DD` format.

### `GET /api/summary`
Generates descriptive executive KPIs, monthly gross revenue trajectories, category revenue distributions, average selling price (ASP), and top/bottom performing products.
- **Query Parameters:** `category`, `start_date`, `end_date`
- **Response:**
  ```json
  {
    "total_revenue": 1428590.25,
    "total_quantity_sold": 28410,
    "revenue_growth_pct": 5.4,
    "yoy_revenue_growth_pct": 11.2,
    "avg_selling_price": 50.28,
    "products_analyzed": 20,
    "stockout_risk_count": 3,
    "overstock_risk_count": 2,
    "latest_period": "2024-12",
    "total_records": 8048,
    "monthly_trend": [
      { "period": "2021-01", "revenue": 24200.0, "quantity": 520 },
      { "period": "2024-12", "revenue": 38400.0, "quantity": 780 }
    ],
    "category_distribution": [
      { "category": "Electronics", "revenue": 520000.0, "quantity": 4200, "share_pct": 36.4 }
    ],
    "best_performing_products": [
      { "sku_id": "ELEC003", "product_name": "Laptop", "product_category": "Electronics", "revenue": 345000.0, "quantity": 315, "avg_price": 1095.24 }
    ],
    "worst_performing_products": [
      { "sku_id": "BEAUTY003", "product_name": "Shampoo", "product_category": "Beauty", "revenue": 21500.0, "quantity": 980, "avg_price": 21.94 }
    ]
  }
  ```

### `GET /api/trends/products`
Computes month-over-month (MoM) sales momentum across all 20 catalog products. Categorizes momentum into `accelerating` (> +5%), `decelerating` (< -5%), or `stable`.
- **Query Parameters:** `category`, `start_date`, `end_date`
- **Response:**
  ```json
  {
    "latest_month": "2024-12",
    "prior_month": "2024-11",
    "trending_up": [
      {
        "sku_id": "CLOTH003",
        "product_name": "Jacket",
        "product_category": "Clothing",
        "latest": 68,
        "prior": 44,
        "growth_pct": 54.55,
        "absolute_change": 24,
        "trend_direction": "accelerating"
      }
    ],
    "trending_down": [
      {
        "sku_id": "BEAUTY005",
        "product_name": "Sunscreen",
        "product_category": "Beauty",
        "latest": 18,
        "prior": 32,
        "growth_pct": -43.75,
        "absolute_change": -14,
        "trend_direction": "decelerating"
      }
    ],
    "ranked_products": [...]
  }
  ```

### `GET /api/trends/categories`
Analyzes Year-over-Year (YoY) volume, gross revenue, and average unit price trends for all retail categories.
- **Query Parameters:** `category`, `start_date`, `end_date`
- **Response:**
  ```json
  [
    {
      "category": "Clothing",
      "total_quantity": 8200,
      "total_revenue": 384500.0,
      "avg_unit_price": 46.89,
      "yoy_growth_pct": 8.4
    }
  ]
  ```

### `GET /api/seasonality`
Computes cyclical profiles across calendar months, days of the week, meteorological seasons, seasonal demand index (100 = neutral), weekend lift, and multi-year YoY matrix.
- **Query Parameters:** `category`, `start_date`, `end_date`
- **Response:**
  ```json
  {
    "by_month": { "1": 18.2, "7": 24.5, "12": 32.1 },
    "by_day_of_week": { "Monday": 19.4, "Saturday": 27.2, "Sunday": 26.8 },
    "by_season": { "Winter": 26.4, "Spring": 21.2, "Summer": 23.8, "Fall": 25.1 },
    "seasonal_index": { "1": 78.4, "7": 105.6, "12": 138.4 },
    "holiday_avg_demand": 34.2,
    "normal_avg_demand": 21.8,
    "weekend_lift_pct": 34.8,
    "yoy_monthly_matrix": [
      { "month": 1, "2021": 17.5, "2022": 18.1, "2023": 18.4, "2024": 18.8 }
    ],
    "data_sufficiency": {
      "status": "sufficient",
      "annual_cycles": 4.0,
      "warning": null
    }
  }
  ```

### `GET /api/diagnostics`
Provides diagnostic analytics contrasting promotional vs non-promotional velocity, holiday lifts, and statistical demand anomalies ($|Z| \ge 1.75$) with non-causal disclaimers.
- **Query Parameters:** `category`, `start_date`, `end_date`
- **Response:**
  ```json
  {
    "promotion_comparison": {
      "promotional_transactions": 1840,
      "non_promotional_transactions": 6208,
      "promo_avg_quantity": 28.4,
      "non_promo_avg_quantity": 19.8,
      "observed_lift_pct": 43.43,
      "avg_discount_pct": 19.8,
      "causal_disclaimer": "NOTICE: This metric represents observed correlation between promotional flags and unit sales. It does not constitute causal attribution without formal experimental or counterfactual control."
    },
    "holiday_comparison": {
      "holiday_transactions": 380,
      "normal_transactions": 7668,
      "holiday_avg_quantity": 35.2,
      "normal_avg_quantity": 21.2,
      "observed_lift_pct": 66.04,
      "causal_disclaimer": "NOTICE: Observed holiday sales surge reflects calendar association, not standalone causal impact."
    },
    "anomalies": [
      {
        "period": "2024-11",
        "quantity": 890,
        "expected_mean": 592.5,
        "z_score": 2.45,
        "direction": "Demand Surge (Positive Anomaly)",
        "explanation": "Observed demand of 890 units deviated by 2.5 standard deviations from the monthly average of 592.5 units."
      }
    ]
  }
  ```

---

## 3. Machine Learning & Forecasting Endpoints

### `POST /api/train`
Triggers synchronous or batch re-training of the XGBoost Regressors across all categories. Generates lag-1, lag-2, and 3-month rolling mean features from historical sales, computes validation error metrics (MAE, RMSE, MAPE), and serializes models to disk (`backend/saved_models/`).
- **Response:**
  ```json
  {
    "status": "success",
    "results": {
      "Beauty": { "mae": 4.12, "rmse": 5.48, "mape_pct": 7.3, "trained": true },
      "Clothing": { "mae": 6.85, "rmse": 8.92, "mape_pct": 8.9, "trained": true }
    }
  }
  ```

### `GET /api/predict`
Generates next-month unit demand predictions with 95% confidence intervals and feature provenance across all supported retail categories using persisted models.
- **Response:**
  ```json
  [
    {
      "category": "Clothing",
      "predicted_demand": 245.8,
      "confidence_range": { "lower": 218.4, "upper": 273.2 },
      "based_on_period": "2024-12",
      "forecast_period": "2025-01",
      "model_version": "2.0.0",
      "model_used": "XGBoost Regressor",
      "is_fallback": false,
      "preferred_model": "XGBoost",
      "data_source": "Synthetic prototype dataset",
      "features_used": {
        "month_num": 1,
        "avg_price": 50.2,
        "promo_days": 4,
        "holiday_days": 1,
        "lag1": 235.0,
        "lag2": 220.0,
        "rolling3": 230.0
      }
    }
  ]
  ```

### `GET /api/predict/{category}`
Generates next-month unit demand prediction specifically for `{category}` (`Beauty`, `Clothing`, `Electronics`, `Home`).
- **Response:** Single prediction object matching the schema above.
- **Error Responses:**
  - `404 Not Found`: Unknown or unsupported category.
  - `503 Service Unavailable`: Persisted model artifact missing from disk.
  - `500 Internal Server Error`: Corrupted model artifact or estimator integrity failure.

### `GET /api/predict/defaults/{category}`
Fetches initial parameters and latest historical lags for user scenario simulations.
- **Response:**
  ```json
  {
    "category": "Clothing",
    "month_num": 1,
    "avg_price": 50.2,
    "promo_days": 4,
    "holiday_days": 1,
    "lag1": 235.0,
    "lag2": 220.0,
    "rolling3": 230.0,
    "current_inventory": 180
  }
  ```

### `POST /api/predict/custom`
Simulates demand forecast and inventory recommendation using persisted model inference and client-provided commercial variables.
- **Request Body:**
  ```json
  {
    "category": "Clothing",
    "month_num": 1,
    "avg_price": 45.0,
    "promo_days": 5,
    "holiday_days": 1,
    "lag1": 220.0,
    "lag2": 210.0,
    "rolling3": 215.0,
    "current_inventory": 150,
    "request_id": "sim-001"
  }
  ```
- **Validation Rules:**
  - `category`: Must be one of `Beauty`, `Clothing`, `Electronics`, `Home`.
  - `month_num`: Integer between 1 and 12.
  - `avg_price`: Positive, finite float (> 0).
  - `promo_days`, `holiday_days`: Non-negative integers, each bounded by the days in `month_num`.
  - `lag1`, `lag2`, `rolling3`: Non-negative finite floats.
  - `current_inventory`: Non-negative integer.
- **Response:**
  ```json
  {
    "category": "Clothing",
    "predicted_demand": 268.4,
    "confidence_range": { "lower": 241.0, "upper": 295.8 },
    "inventory_analysis": {
      "current_inventory": 150,
      "variance": -118.4,
      "status": "Critical Stockout Risk",
      "shortage_qty": 118.4,
      "surplus_qty": 0.0,
      "safety_buffer": 53.7,
      "target_inventory": 322,
      "recommended_reorder": 172,
      "explanation": "Projected demand of 268.4 units exceeds on-hand stock..."
    },
    "model_version": "2.0.0",
    "model_used": "XGBoost Regressor",
    "is_fallback": false,
    "preferred_model": "XGBoost",
    "features_used": { ... },
    "request_id": "sim-001"
  }
  ```

### `POST /api/predict/batch`
Batch inference endpoint accepting a list of custom scenario prediction requests with item-level error isolation (partial success supported).
- **Batch Policy:**
  - Individual bad inputs (e.g. unknown category) fail independently with `success: false` and an item-level `error` message without failing or crashing the rest of the batch.
  - Valid items return `success: true` and a complete `prediction` object.
- **Request Body:**
  ```json
  {
    "items": [
      { "category": "Beauty", "month_num": 5, "avg_price": 25.0, "lag1": 80.0, "lag2": 75.0, "request_id": "req-1" },
      { "category": "UnknownCat", "month_num": 5, "avg_price": 30.0, "lag1": 50.0, "lag2": 50.0, "request_id": "req-2" }
    ]
  }
  ```
- **Response:**
  ```json
  {
    "total_items": 2,
    "successful_count": 1,
    "failed_count": 1,
    "successful_items": 1,
    "failed_items": 1,
    "results": [
      {
        "index": 0,
        "request_id": "req-1",
        "success": true,
        "category": "Beauty",
        "prediction": { ... },
        "error": null
      },
      {
        "index": 1,
        "request_id": "req-2",
        "success": false,
        "category": "UnknownCat",
        "prediction": null,
        "error": "Unknown category 'UnknownCat'. Supported categories: Beauty, Clothing, Electronics, Home"
      }
    ]
  }
  ```

### `GET /api/ml/status` (or `GET /api/models`)
Inspects the persisted model artifacts, disk presence, in-memory cache states, model versions, and residual calibration error for each category.
- **Response:**
  ```json
  {
    "total_supported": 4,
    "models": [
      {
        "category": "Beauty",
        "file_exists": true,
        "cached_in_memory": true,
        "model_version": "2.0.0",
        "trained_at": "2026-10-12T15:32:18",
        "residual_std": 20.45,
        "preferred_model": "Moving Average (3-Month)",
        "wape_pct": 14.12,
        "features": ["month_num", "avg_price", "promo_days", "holiday_days", "lag1", "lag2", "rolling3"]
      }
    ]
  }
  ```

### `GET /api/metrics`
Returns comprehensive out-of-sample chronological hold-out validation metrics (MAE, RMSE, MAPE, WAPE), baseline model comparisons (Naive, Seasonal-Naive, Moving Average), model selection decisions, and the validation series for each category model.
- **Response:**
  ```json
  [
    {
      "category": "Clothing",
      "model_version": "2.0.0",
      "mae": 37.18,
      "rmse": 43.43,
      "mape_pct": 10.28,
      "wape_pct": 10.22,
      "empirical_coverage_pct": 100.0,
      "n_train": 36,
      "n_test": 9,
      "train_period": "2021-04 to 2024-03",
      "test_period": "2024-04 to 2024-12",
      "baselines": {
        "naive": { "mae": 47.44, "rmse": 53.08, "mape_pct": 13.36, "wape_pct": 13.04 },
        "seasonal_naive": { "mae": 62.11, "rmse": 75.26, "mape_pct": 16.84, "wape_pct": 17.07 },
        "moving_average_3": { "mae": 49.44, "rmse": 56.94, "mape_pct": 13.81, "wape_pct": 13.59 }
      },
      "best_baseline": "naive",
      "preferred_model": "XGBoost",
      "mae_improvement_pct": 21.63,
      "wape_improvement_pct": 21.63,
      "decision_summary": "XGBoost outperforms the best baseline (naive) with 21.63% lower MAE (37.18 vs 47.44 units) and 21.63% lower WAPE.",
      "validation_chart": [
        {
          "period": "2024-04",
          "actual": 340.0,
          "predicted": 322.4,
          "naive": 315.0,
          "seasonal_naive": 298.0,
          "moving_average_3": 310.2
        }
      ]
    }
  ]
  ```

### `GET /api/ml/benchmark`
Provides a consolidated cross-category benchmark scorecard comparing XGBoost against all three time-series baselines (Naive, Seasonal-Naive, 3-Month Moving Average) over the chronological hold-out test period.
- **Response:**
  ```json
  {
    "timestamp": "2026-10-12T15:32:18.000000+00:00",
    "model_version": "2.0.0",
    "evaluation_strategy": "Chronological hold-out (80% train / 20% future test without shuffling)",
    "features_evaluated": ["month_num", "avg_price", "promo_days", "holiday_days", "lag1", "lag2", "rolling3"],
    "scorecard": "XGBoost outperformed baselines in 3 of 4 retail categories.",
    "aggregate_metrics": {
      "xgboost": { "avg_mae": 47.31, "avg_rmse": 55.6, "avg_wape_pct": 13.76 },
      "naive": { "avg_mae": 57.3, "avg_rmse": 71.98, "avg_wape_pct": 16.89 },
      "seasonal_naive": { "avg_mae": 59.17, "avg_rmse": 69.73, "avg_wape_pct": 17.28 },
      "moving_average_3": { "avg_mae": 60.28, "avg_rmse": 71.23, "avg_wape_pct": 18.41 }
    },
    "findings": [
      "XGBoost yields strong predictive gains in seasonal and promo-driven categories (Clothing, Electronics, Home).",
      "Moving Average (3-Month) achieved lower error in Beauty, demonstrating the importance of honest baseline benchmarking.",
      "WAPE provides reliable evaluation without distortion from low individual monthly volumes."
    ],
    "categories": [...]
  }
  ```

### `GET /api/ml/feature-schema`
Returns the production feature dictionary and data leakage prevention audit contract for model training and inference parity.
- **Response:**
  ```json
  {
    "version": "2.0.0",
    "target": "total_quantity",
    "target_description": "Total monthly demand units sold per product category",
    "features": [
      { "name": "month_num", "dtype": "int", "type": "temporal_calendar" },
      { "name": "avg_price", "dtype": "float", "type": "commercial" },
      { "name": "promo_days", "dtype": "int", "type": "commercial" },
      { "name": "holiday_days", "dtype": "int", "type": "calendar" },
      { "name": "lag1", "dtype": "float", "type": "autoregressive" },
      { "name": "lag2", "dtype": "float", "type": "autoregressive" },
      { "name": "rolling3", "dtype": "float", "type": "moving_average" }
    ],
    "leakage_prevention_audit": {
      "lag1": "shift(1) - strictly prior period observation",
      "lag2": "shift(2) - strictly two periods prior observation",
      "rolling3": "shift(1).rolling(3) - strictly excludes target period t",
      "target_period_excluded": true,
      "split_method": "Strict chronological train (80%) and hold-out test (20%) without shuffling"
    }
  }
  ```

---

## 4. Supply Chain & Inventory Risk Endpoints

### `GET /api/inventory/intelligence`
Comprehensive inventory risk intelligence and replenishment planning. Calculates lead-time demand ($LTD = D \times L / 30$), net available stock, safety stock buffers, stockout and overstock severity ratings, and suggested replenishment quantities.
- **Query Parameters:** `category` (optional, string: `Beauty`, `Clothing`, `Electronics`, `Home`, or `all`).
- **Response:**
  ```json
  {
    "summary": {
      "total_categories": 4,
      "stockout_risk_count": 3,
      "overstock_risk_count": 0,
      "healthy_count": 1,
      "total_suggested_reorder_units": 1160,
      "active_dataset_cycle": "2024-12 (Historical Dataset)"
    },
    "category_risks": [
      {
        "category": "Clothing",
        "forecast_demand": 383.0,
        "forecast_period": "2025-01 (Historical Prototype)",
        "confidence_lower": 355.0,
        "confidence_upper": 411.0,
        "current_inventory": 45.0,
        "safety_stock": 78.0,
        "reorder_point": 157.0,
        "lead_time_days": 6.2,
        "lead_time_demand": 79.2,
        "confirmed_incoming_inventory": 0,
        "incoming_inventory_tracked": false,
        "net_inventory_available": -34.2,
        "suggested_replenishment_qty": 416,
        "stockout_risk": true,
        "stockout_severity": "High",
        "overstock_risk": false,
        "surplus_units": 0,
        "inventory_status": "Critical Stockout",
        "assumptions": [
          "Supplier lead time: 6 days (proportional lead-time demand: ~79 units).",
          "Confirmed incoming orders: Untracked in dataset (assumed 0 units).",
          "Automated purchasing disabled. Manager review required."
        ],
        "strategic_explanation": "Predicted demand (383 units) exceeds on-hand buffer (~45 units) with 6-day lead time."
      }
    ],
    "lead_time_assumptions": {
      "default_lead_time_days": 14,
      "source": "Catalog product specifications with 14-day planning default when untracked",
      "incoming_orders_tracked": false
    },
    "disclaimer": "Advisory Notice: Suggested reorder quantities are recommendations only. Automated purchasing is disabled."
  }
  ```

### `GET /api/pricing/insights`
Observational pricing and promotion analysis. Computes empirical price elasticity ($\epsilon = \% \Delta Q / \% \Delta P$), average discount rates, and markdown clearance candidates for overstocked inventory.
- **Query Parameters:** `category` (optional, string).
- **Response:**
  ```json
  {
    "summary": {
      "total_categories": 4,
      "elastic_categories_count": 2,
      "markdown_candidates_count": 0,
      "average_discount_pct": 14.8
    },
    "category_insights": [
      {
        "category": "Clothing",
        "avg_unit_price": 77.0,
        "avg_discount_pct": 16.2,
        "promotion_frequency_pct": 28.5,
        "price_elasticity": -1.42,
        "elasticity_classification": "Price Elastic (Volume Expands Under Discount)",
        "promotional_volume_lift_pct": 24.8,
        "markdown_review_recommended": false,
        "observation": "Clothing exhibits high promotional responsiveness (-1.42 elasticity).",
        "assumptions": [
          "Price elasticity is observed empirically from 2021-2024 historical transactions.",
          "Wholesale unit costs and profit margins are not tracked in the dataset.",
          "Clearance markdowns are advisory recommendations, not automated price adjustments."
        ]
      }
    ],
    "limitations": [
      "No Wholesale Cost / Margin Data: Retail database tracks selling prices but lacks supplier unit costs.",
      "Observational Correlation Only: Demand lifts under promotion do not guarantee causal profit increases.",
      "Non-Automated: DemandIQ does not adjust live storefront pricing."
    ],
    "disclaimer": "Observational Pricing Notice: Price elasticity figures represent historical correlations, not causal guarantees."
  }
  ```

### `GET /api/inventory/products`
Granular SKU-level inventory health for all catalog products, classifying each as `Healthy`, `Critical Stockout`, `Reorder Required`, or `Overstock`.
- **Query Parameters:** `category` (optional, string).

---

## 5. Machine Learning Prediction Endpoints

### `POST /api/predict/custom`
Simulate next-month demand for a category under custom what-if business parameters (lag demand, price, promotion days, holiday count).
- **Request Body:**
  ```json
  {
    "category": "Clothing",
    "avg_price": 75.0,
    "promo_days": 8,
    "holiday_days": 2,
    "lag1": 380.0,
    "lag2": 350.0,
    "rolling3": 360.0,
    "month_num": 1
  }
  ```
- **Response:**
  ```json
  {
    "category": "Clothing",
    "predicted_demand": 386.4,
    "confidence_range": { "lower": 358.0, "upper": 414.8 },
    "input_features": { "avg_price": 75.0, "promo_days": 8, "holiday_days": 2, "month_num": 1 },
    "model_version": "2.0.0",
    "model_used": "XGBoost Regressor (Persisted)",
    "forecast_period": "Custom Simulation"
  }
  ```

### `POST /api/predict/batch`
Execute batch multi-category predictions in a single validated transaction, isolating partial failures without terminating valid inferences.
- **Request Body:** Array of `PredictionRequest` objects.

---

## 6. Artificial Intelligence & Assistant Endpoints

### `GET /api/insights/structured`
Produces normalized, auditable structured business insights with deterministic IDs, evidence-quality labels, and calculation provenance.
- **Query Parameters:** `category` (optional, string).
- **Response:**
  ```json
  {
    "category": "All",
    "total_insights": 7,
    "active_dataset_cycle": "Historical Synthetic Series (Jan 2021 - Dec 2024)",
    "generated_at": "2026-10-12T22:30:00Z",
    "insights": [
      {
        "id": "INS-INV-CLOTHING-STOCKOUT",
        "title": "Clothing: High Stockout Risk",
        "category": "inventory_risk",
        "severity": "CRITICAL",
        "target_category": "Clothing",
        "target_sku": null,
        "target_period": "2025-01 (Historical Prototype)",
        "explanation": "Clothing projected demand (383 units) exceeds on-hand holdings (45 units) with 6-day lead time.",
        "supporting_metrics": {
          "current_inventory": 45.0,
          "forecast_demand": 383.0,
          "reorder_point": 157.0,
          "suggested_replenishment_qty": 416
        },
        "recommendation": "Submit purchase order for ~416 units of Clothing to restore safe buffers.",
        "data_source": "get_inventory_intelligence()",
        "evidence_quality": "ESTIMATED_RUN_RATE",
        "limitations": [
          "Supplier lead time reflects category average (~6 days, using 14-day planning default when untracked).",
          "Incoming inventory untracked (assumed 0 units)."
        ]
      }
    ],
    "disclaimer": "Grounding Note: All insights are deterministically calculated from verified analytics."
  }
  ```

### `GET /api/insights`
Executive cross-category briefing synthesized from demand patterns, inventory risk, and model benchmarks. Integrates with Gemini/Ollama with automatic fallback to the deterministic analytics engine.

### `POST /api/ask`
Conversational Business Assistant. Answers specific retail questions with intent resolution, metric chips, period labeling, and explicit disclaimers against automated ordering.
- **Request Body:**
  ```json
  {
    "question": "Which categories show the greatest inventory risk?",
    "category": null
  }
  ```
- **Response:**
  ```json
  {
    "question": "Which categories show the greatest inventory risk?",
    "answer": "Based on the January 2025 Historical Prototype Forecast, the category facing the greatest inventory risk is Clothing, classified with High Priority Stockout Risk...",
    "provider": "DemandIQ Business Assistant Engine",
    "intent": "inventory_risk",
    "data_type": "INVENTORY_POLICY",
    "period": "2025-01 (Historical Prototype Forecast, data through 2024-12)",
    "supporting_metrics": {
      "stockout_categories_count": 3,
      "overstock_categories_count": 0,
      "total_suggested_reorder_units": 1160
    },
    "recommendations": [
      "Review purchase orders for Clothing (416 units)",
      "Review purchase orders for Beauty (267 units)"
    ],
    "limitations": [
      "Supplier lead times reflect category averages (~5–8 days) or a 14-day default planning buffer.",
      "Confirmed incoming inventory is untracked and assumed 0 units.",
      "Single-step prototype projection from December 2024 baseline."
    ],
    "clarifying_question": null,
    "disclaimer": "Automated ordering is strictly disabled. Human review is required."
  }
  ```

