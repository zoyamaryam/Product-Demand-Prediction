# System Architecture

## Overview
The Product Demand & Trend Prediction platform uses a decoupled client-server architecture:
1. **Frontend:** React SPA (Single Page Application) built with Vite.
2. **Backend:** REST API powered by FastAPI.
3. **Machine Learning:** Embedded inside the backend, using XGBoost for predictive modeling.

## 1. Frontend Architecture
The frontend is built using React and is responsible for data visualization and user interaction.

- **Routing:** Managed via `react-router-dom` in `App.jsx`.
- **Pages:**
  - `ExecutiveSummary.jsx`: High-level business overview.
  - `Trends.jsx`: Deep dive into sales velocities and YoY trends.
  - `Forecast.jsx`: ML-driven future demand predictions.
  - `Seasonality.jsx`: Calendar-based cyclicality patterns.
  - `InventoryRisk.jsx`: Stockout and overstock alerting.
  - `AIInsights.jsx`: Automated strategic pillars.
  - `Assistant.jsx`: Chatbot interface.
- **Visualizations:** Powered by `recharts`. The data flows from the backend directly into charting components.
- **State Management:** Handled largely via local component state (`useState`, `useEffect`) fetching data from the REST API.

## 2. Backend Architecture
The backend is a FastAPI application that serves data and runs machine learning inferences on demand.

- **Main Application (`app/main.py`):** The entry point defining the REST endpoints, configuring CORS, and wiring up the API routes.
- **Analytics Service (`app/analytics.py`):** Processes historical data, generating metrics like YoY growth, seasonality indexes, and trending product lists.
- **Machine Learning Module (`app/ml.py`):** Wraps the XGBoost models. It includes utilities to train category-specific models (`train_model`), serialize them, and load them for real-time inference (`predict_demand`).
- **Data Persistence:** Currently, data might be seeded via `seed_data.py`. Moving forward, `SQLAlchemy` is configured for structured relational data access.

## 3. Data Flow
1. **Client Request:** The React frontend makes an HTTP GET/POST request (using `fetch` or `axios`) to a specific FastAPI endpoint.
2. **Data Processing/Inference:**
   - If historical data is requested, `app/analytics.py` queries the dataset, aggregates the metrics, and formats the response.
   - If a forecast is requested, `app/ml.py` loads the relevant serialized XGBoost model from `saved_models/`, processes the input features, and returns the predicted values.
3. **Response:** FastAPI serializes the output to JSON.
4. **Client Render:** React updates its state and re-renders the `recharts` visualizations with the new data.
