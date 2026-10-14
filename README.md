# DemandIQ 2.0 — Predictive Retail Demand & Decision-Support Platform

A full-stack predictive retail forecasting and inventory decision-support platform powered by **FastAPI**, **persisted XGBoost regression models**, **baseline benchmark governance**, and a modern **React 19 / Vite** analytics interface.

---

> [!IMPORTANT]
> **PROTOTYPE SYNTHETIC DATA & GOVERNANCE NOTICE**
> - **100% Synthetic Dataset:** All sales transactions and catalog items are synthetically generated (`is_synthetic = 1`, `data_source = "DemandIQ_Synthetic_Retail_v2"`) for prototype validation and demonstration. They do not represent genuine commercial records.
> - **Temporal Horizon:** The historical dataset spans **48 consecutive months: January 2021 through December 2024**.
> - **Prototype Forecast Cycle:** All displayed predictions represent a **January 2025 Historical Prototype Forecast** evaluated against the historical December 2024 baseline. They are not live sales forecasts for current dates in 2026.
> - **Advisory Replenishment:** Automated purchase order placement is strictly disabled (`automated_ordering_enabled = false`). All recommendations require managerial review.

---

## 🚀 Key Features

1. **Executive Performance Overview**: Real-time business KPIs, historical gross revenue trajectories, category revenue distributions, average selling price (ASP), and top/bottom performing products.
2. **Sales Velocity & Momentum Tracking**: Real-time month-over-month (MoM) product momentum tracking (accelerating vs. decelerating items) and year-over-year (YoY) annual growth benchmarks.
3. **Seasonality & Cyclicality Analysis**: Breakdown of demand cycles across calendar months, days of the week, meteorological seasons, and promotional holiday lift surges.
4. **Demand Forecasting & What-If Simulation**: Category demand forecasts with 95% parametric confidence bands, custom feature simulation, and multi-category batch inference.
5. **Model Governance & Benchmark Scorecard**: Transparent benchmarking of XGBoost against Naive, Seasonal Naive, and 3-Month Moving Average baselines using Weighted Absolute Percentage Error (WAPE). Transparently acknowledges where heuristics outperform machine learning (e.g., Beauty category).
6. **Supply Chain & Inventory Risk Radar**: Safety stock buffers, proportional lead-time demand calculations ($LTD = D \times L / 30$), reorder thresholds ($ROP$), surplus detection, and CSV audit export.
7. **Pricing & Markdown Observations**: Observational price elasticity calculations and promotional clearance advisories without unwarranted causal profit claims.
8. **Structured AI Insights Engine**: Normalized, auditable insights with deterministic IDs, evidence-quality labels, verified metrics, recommendations, and underlying assumptions.
9. **Conversational Business Assistant**: Data-grounded assistant answering key business questions with supporting metric chips, advisory next steps, and transparent handling of unavailable or ambiguous data.

---

## 🛠️ Technology Stack

### Frontend
- **React 19 & Vite 8**: Modern high-performance single page application with route-based code splitting (`React.lazy` and `Suspense`).
- **Recharts**: Responsive SVG charting (Area, Bar, and Line charts with custom gradients and tooltips).
- **React Router 7**: Declarative client-side routing.
- **Axios**: Configured HTTP client with comprehensive error response interception and timeout handling.
- **Modern CSS Design System**: Custom design tokens, CSS variables, dark-accented sidebar, responsive typography, and mobile drawer transitions.

### Backend & Machine Learning
- **FastAPI**: Async ASGI web framework with strict Pydantic v2 schemas and OpenAPI documentation.
- **XGBoost Regressors**: Category-specific models persisted on disk (`model_Beauty.pkl`, `model_Clothing.pkl`, `model_Electronics.pkl`, `model_Home.pkl`).
- **Scikit-Learn**: Chronological hold-out evaluation (80% train / 20% test without shuffling) and error metrics (MAE, RMSE, WAPE).
- **SQLAlchemy & SQLite**: Structured persistence for retail transactions and catalog items.
- **Pytest**: Complete automated test suite covering 81 unit, integration, and API contract tests.

---

## 📁 Repository Structure

```
product-demand-prediction/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI entry point, CORS, and health endpoints
│   │   ├── config.py          # Environment settings (Gemini, Ollama, paths)
│   │   ├── db.py              # SQLite models (SalesRecord) and session factory
│   │   ├── ml.py              # XGBoost training, lag feature engineering, inference, benchmarks
│   │   ├── analytics.py       # Aggregations, seasonality, growth rates, SKU inventory
│   │   ├── recommendations.py # Inventory health diagnostics, safety stock & pricing insights
│   │   ├── ai.py              # Structured insights engine, intent routing & conversational assistant
│   │   ├── schemas.py         # Pydantic request and response schemas
│   │   └── routers/           # Modular API endpoints (trends, predictions, recommendations, ai)
│   ├── tests/                 # 81 automated Pytest test cases
│   ├── saved_models/          # Serialized XGBoost models (.pkl)
│   ├── generate_dataset.py    # Synthetic dataset generator (reproducible seed=42)
│   ├── seed_data.py           # Database migration & seeding utility
│   ├── requirements.txt       # Python dependencies
│   └── .env.example           # Safe environment variable configuration template
├── frontend/
│   ├── src/
│   │   ├── api.js             # Unified Axios client with error normalization
│   │   ├── App.jsx            # Layout, topbar cycle indicator, code-split routing
│   │   ├── components/        # Sidebar, LoadingState, ErrorState, EmptyState
│   │   ├── pages/             # ExecutiveSummary, Trends, Seasonality, Forecast, PredictDemand,
│   │   │                      # ModelPerformance, InventoryRisk, AIInsights, Assistant
│   │   └── index.css          # Design system & responsive layout styles
│   ├── package.json
│   └── vite.config.js
├── docs/
│   ├── api.md                 # Complete REST API specification and payload examples
│   ├── architecture.md        # Technical architecture & data flow diagrams
│   ├── business_rules.md      # Inventory, replenishment, pricing & AI insight rules
│   ├── data_dictionary.md     # Schema field definitions & catalog specification
│   ├── ml_experiments.md      # Train/test split, baselines, metrics & model limitations
│   ├── testing.md             # Automated test commands, coverage & validation procedures
│   └── demo_script.md         # Reproducible 8-step demonstration walkthrough
└── README.md
```

---

## 🏁 Quickstart & Run Instructions

### Prerequisites
- **Node.js**: v18+ recommended (v16+ supported)
- **Python**: 3.10+ (tested on Python 3.13)

### 1. Backend Setup & Startup
1. Open a terminal and navigate to `backend/`:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell):
   python -m venv venv
   .\venv\Scripts\activate

   # macOS / Linux:
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   pip install pytest httpx pytest-asyncio
   ```
4. Seed the database with the verified synthetic dataset (if needed):
   ```bash
   python seed_data.py
   ```
5. Start the backend API server:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```
   *The API will be available at `http://127.0.0.1:8000` with interactive docs at `http://127.0.0.1:8000/docs`.*

### 2. Frontend Setup & Startup
1. Open a second terminal and navigate to `frontend/`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend dashboard will be available at `http://localhost:5173`.*

---

## 🧪 Testing & Verification

### Run Full Backend Test Suite (81 Tests)
```bash
cd backend
.\venv\Scripts\python.exe -m pytest tests/ -v --tb=short
```

### Run Frontend ESLint Check
```bash
cd frontend
npm run lint
```

### Run Frontend Production Build
```bash
cd frontend
npm run build
```

---

## 📚 Technical Documentation Index

- [Architecture & Data Flow Diagram](docs/architecture.md)
- [REST API Reference](docs/api.md)
- [Business Rules & Replenishment Policies](docs/business_rules.md)
- [Data Dictionary & Dataset Specification](docs/data_dictionary.md)
- [Machine Learning Forecasting Experiments & Benchmarks](docs/ml_experiments.md)
- [Testing & Validation Guide](docs/testing.md)
- [Interactive Demonstration Walkthrough](docs/demo_script.md)