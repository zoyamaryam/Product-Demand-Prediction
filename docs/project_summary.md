# DemandIQ 2.0 — Project Summary & Executive Abstract

**Document Version:** 2.0.0  
**Phase:** Final Evaluation & Capstone Summary  
**Date:** October 2026  
**Engineering Delivery:** Collaborative Engineering by a **Team of 4**  

---

## 1. Project Abstract

**DemandIQ 2.0** is an enterprise-grade predictive retail forecasting and inventory decision-support platform designed to solve the chronic mismatch between retail demand volatility and supply chain replenishment. Combining an asynchronous **FastAPI** backend, persisted **XGBoost regression ensembles**, and a responsive **React 19 / Vite** analytics interface, DemandIQ 2.0 bridges the gap between machine learning research and frontline retail operations.

Unlike traditional predictive systems that deploy black-box models in isolation, DemandIQ 2.0 introduces **strict baseline governance**, benchmarking XGBoost against Naive (Lag-1), Seasonal-Naive (Lag-12), and 3-Month Moving Average baselines using Weighted Absolute Percentage Error (**WAPE**). The system transparently adopts simple heuristics when they outperform machine learning (as demonstrated in the *Beauty* category). 

Furthermore, DemandIQ 2.0 translates forecast outputs into actionable supply chain intelligence through a deterministic replenishment policy that calculates proportional lead-time demand ($LTD = D \times L / 30$), dynamic safety buffers, and reorder points ($ROP = LTD + SS$) without cliff discontinuities. To prevent the growing threat of generative AI hallucinations, the platform features a **Structured AI Insights Engine** and a **Conversational Business Assistant** that strictly grounds answers in verified application data, gracefully rejects unavailable financial metrics (such as missing wholesale supplier costs), and enforces non-automated purchase order boundaries.

The platform is fully validated against a reproducible 48-month synthetic dataset (January 2021 through December 2024) across 8,048 transactions and backed by **81 automated Pytest test cases achieving a 100% pass rate**.

---

## 2. Key Contributions by Team of 4

DemandIQ 2.0 was developed through a modular, four-role engineering division:

```mermaid
flowchart LR
    subgraph M1 [Member 1: Data & Analytics Lead]
        D1[Synthetic Data Pipeline<br/>48 Months / 8,048 Rows]
        D2[SQLite Schema & Indices<br/>Mathematical Consistency]
        D3[Time-Series Analytics<br/>YoY & Seasonality Index]
    end

    subgraph M2 [Member 2: ML & Forecasting Lead]
        L1[Leakage-Free Feature Engine<br/>Shift & Lag Barriers]
        L2[Chronological 80/20 Holdout<br/>XGBoost Regressors]
        L3[Baseline Scorecards & WAPE<br/>Out-of-Sample Prediction Intervals]
    end

    subgraph M3 [Member 3: Backend & Decisions Lead]
        B1[FastAPI Async Framework<br/>Pydantic v2 Schema Guards]
        B2[Replenishment Policy Engine<br/>LTD, SS, ROP, Target Buffer]
        B3[Observational Price Elasticity<br/>Non-Causal Pricing Rules]
    end

    subgraph M4 [Member 4: Frontend & AI Lead]
        F1[React 19 SPA with Vite<br/>Route-Level Code Splitting]
        F2[Structured AI Insights Engine<br/>Deterministic ID Contract]
        F3[Grounded Business Assistant<br/>Guardrails & Zero-Downtime Fallback]
    end

    M1 --> M2 --> M3 --> M4
```

### Member 1: Data Engineering & Analytics Lead
- **Synthetic Data Generation Pipeline (`generate_dataset.py`):** Engineered a reproducible (`seed=42`) retail dataset spanning 48 consecutive months (2021-01 to 2024-12) across 20 stable SKUs and 4 categories (*Beauty*, *Clothing*, *Electronics*, *Home*).
- **Relational Persistence Architecture (`app/db.py`, `seed_data.py`):** Designed the SQLite schema (`sales_records`) with multi-column indices and verified the mathematical identity $\text{Revenue} = \text{Quantity} \times \text{Unit Price} \times (1 - \text{Discount})$ to $< \$0.01$ tolerance.
- **Descriptive & Time-Series Analytics Engine (`app/analytics.py`):** Implemented high-performance Pandas aggregation pipelines computing executive KPIs, category revenue shares, MoM sales momentum classifications, and normalized monthly seasonality indices.

### Member 2: Machine Learning & Forecasting Lead
- **Leakage-Free Feature Engineering (`app/ml.py`):** Formulated an invariant 7-feature schema using strict shift barriers (`shift(1)`, `shift(2)`, `shift(1).rolling(3).mean()`) that mathematically exclude target period $y_t$.
- **Chronological Evaluation Methodology (`app/ml.py`, `docs/ml_experiments.md`):** Established an 80% chronological training split (36 months) and a completely untouched 20% hold-out test set (9 months) without random shuffling.
- **Model Training, Governance & Baseline Scorecards (`app/ml.py`):** Trained category-specific XGBoost regressors and evaluated them against Naive, Seasonal-Naive, and 3-Month Moving Average models. Proved that XGBoost excels in seasonal categories (Clothing WAPE: 10.22%, Electronics WAPE: 9.51%, Home WAPE: 13.15%), while transparently documenting that Moving Average wins in Beauty (WAPE: 15.17% vs XGBoost: 22.17%).
- **Prediction Interval Quantification (`app/ml.py`):** Replaced in-sample residual variance with out-of-sample hold-out test RMSE ($s_{\text{test}}$), boosting empirical test coverage from ~40% to 94.4%.

### Member 3: Backend API & Decision Systems Lead
- **FastAPI Asynchronous Architecture (`app/main.py`, `routers/*`):** Engineered an asynchronous ASGI REST API with application lifespan preloading, dynamic CORS middleware, and modular routers.
- **Pydantic v2 Schema Contract & Input Guards (`app/schemas.py`):** Implemented strict schema validation enforcing finite numbers (`math.isfinite`) and physical calendar limits (rejecting impossible promo days or leap year anomalies).
- **Inventory Replenishment & Decision Intelligence (`app/recommendations.py`):** Formulated the proportional lead-time demand calculation ($LTD = D \times L / 30$), dynamic safety stock ($SS = Z \times \sigma_L$), and smooth target stock replenishment that eliminated reorder cliff discontinuities.
- **Observational Pricing Analytics (`app/recommendations.py`):** Developed price elasticity estimations with strict non-causal disclosures, disclaiming profit maximization due to the absence of wholesale COGS.

### Member 4: Frontend UI/UX & Conversational AI Lead
- **React 19 Single Page Application (`frontend/src/*`):** Built a responsive analytics dashboard with Vite 8, featuring route-level code splitting (`React.lazy`/`Suspense`), unified Axios error interceptors, and custom CSS design tokens.
- **Interactive Visualizations & Tooling:** Styled responsive Recharts SVG components (Area, Bar, and Line charts) and implemented 1-click CSV audit report generation and clipboard copying.
- **Structured AI Insights Engine (`app/ai.py`):** Created a normalized 10-field insight contract with deterministic identifiers, evidence quality badges (`HIGH_EMPIRICAL`, `MODEL_BENCHMARK`, `ESTIMATED_RUN_RATE`), and contradiction prevention rules.
- **Conversational Business Assistant (`app/ai.py`):** Designed a natural-language assistant grounded in verified backend services, equipped with guardrails intercepting queries regarding absent COGS, clarifying ambiguous prompts, refusing automated order placement, and providing a zero-downtime deterministic analytical fallback.

---

## 3. Empirical Testing Evidence & Validation

The platform's reliability, mathematical precision, and contractual parity are validated by a test suite of **81 automated test cases with a 100% pass rate** executed via Pytest:

```
================== 81 passed, 1 warning in 300.59s (0:05:00) ==================
```

### Test Suite Distribution

| Test Module | Tests | Scope & Invariants Verified |
| :--- | :---: | :--- |
| `tests/test_dataset_validation.py` | 8 | Mathematical revenue identity, non-negativity, zero nulls, 48 consecutive months, stable 20-SKU catalog, synthetic data flags. |
| `tests/test_analytics.py` | 8 | Descriptive KPIs, category distributions, MoM momentum classification, seasonality indices, holiday demand lift, date filtering. |
| `tests/test_ml.py` | 18 | Chronological 80/20 train/test split, feature shift barriers, zero leakage, baseline comparisons, XGBoost serialization, cached ModelRegistry. |
| `tests/test_recommendations.py` | 2 | Legacy recommendation compatibility, inventory snapshot aggregations. |
| `tests/test_inventory_and_pricing.py` | 7 | Proportional lead-time demand ($LTD$), continuous target buffer formulas, stockout/overstock flags, empirical elasticity, non-causal rules. |
| `tests/test_ai.py` | 3 | Backward-compatible analytical briefing generator, deterministic fallback responses. |
| `tests/test_ai_insights_and_assistant.py` | 19 | Structured insight schema fields, contradiction prevention, 6 canonical questions, unavailable COGS rejection, ambiguous query clarification, order execution blocking, offline fallback. |
| `tests/test_api_endpoints.py` | 16 | FastAPI HTTP routes, batch inference, custom prediction schema validation (422), missing model rejection (503), category 404s, CORS headers. |

---

## 4. Known System Limitations

To ensure transparency and academic integrity, DemandIQ 2.0 explicitly documents its operational boundaries:

1. **Synthetic Dataset Provenance:**
   The active database is 100% synthetically generated for prototype demonstration. It terminates on December 31, 2024. Projections for January 2025 represent historical prototype evaluations rather than live predictions for current operational dates.
2. **Single-Month Forecast Horizon:**
   Models project aggregate category demand for a single forward month ($t+1$). Multi-month recursive forecasting compounds uncertainty beyond 30 days and is not implemented in this version.
3. **Absence of Wholesale Costs & Margins (COGS):**
   The database records retail selling prices, discounts, and revenues, but does not capture supplier invoices, wholesale acquisition costs, or shipping charges. Therefore, DemandIQ cannot calculate gross profit margins or determine net-profit-optimal prices.
4. **Observational Pricing (Non-Causal):**
   Price elasticity is derived from historical correlation. Because price adjustments co-occurred with marketing campaigns, the platform does not claim that reducing prices will causally increase profitability.
5. **Untracked Incoming Inventory:**
   Open purchase orders in transit are not tracked in the schema and are assumed to be 0 units.
6. **Non-Automated Ordering:**
   The replenishment engine is advisory only. Automated purchase order dispatch to suppliers is strictly disabled (`automated_ordering_enabled = false`).

---

## 5. Strategic Future Work

The engineering team has identified several high-impact architectural enhancements for post-prototype releases:

1. **Enterprise Database Migration:**
   Transition the persistence layer from embedded SQLite to a managed **PostgreSQL** database with read replicas, connection pooling via PgBouncer, and partition pruning on `order_date`.
2. **Multi-Horizon Recursive Forecasting:**
   Extend feature engineering to support 3-month and 6-month recursive forward projections using multi-output quantile regression trees or Temporal Fusion Transformers (TFT).
3. **ERP / WMS API Connectors:**
   Implement webhooks and REST integrations with enterprise inventory management systems (e.g., SAP S/4HANA, Oracle NetSuite) to ingest live warehouse bin counts and track confirmed purchase orders in transit.
4. **Causal Econometric & Markdown Optimization:**
   Incorporate wholesale cost feeds and implement Double Machine Learning (DML) or Bayesian structural time-series models to isolate true causal price elasticity and optimize markdown schedules to maximize gross profit.
5. **Real-Time Streaming Ingestion:**
   Introduce an Apache Kafka or RabbitMQ event-driven streaming layer to ingest POS transactions in real time and trigger dynamic intra-day stockout alerts.
