# DemandIQ 2.0 — Machine Learning Forecasting Experiments & Benchmark Report

**Phase:** Phase 3 — Baseline Forecasting, XGBoost Experiments & Chronological Evaluation  
**Date:** October 2026  
**Status:** Validated & Persisted (`saved_models/`)  
**Artifact Version:** `2.0.0`

---

## 1. Executive Summary & Objective

In **DemandIQ 2.0**, forecasting is framed as a structured, decision-support tool for retail store operators and category planners. The objective is to forecast aggregate monthly category sales demand ($\hat{y}_{t+1}$) for the upcoming month to drive proactive inventory procurement and prevent costly stockouts or bloated overstocking.

To ensure scientific and business integrity, the machine learning workflow strictly adheres to these principles:
1. **Never claim model superiority without empirical benchmarking against simple, transparent baselines.**
2. **Prevent data leakage** across all autoregressive and rolling feature derivations.
3. **Use chronological splits** without random shuffling, respecting the true temporal arrow of time.
4. **Report business-relevant metrics** including **WAPE** (Weighted Absolute Percentage Error), which treats low-volume or zero-volume actuals without distortion.
5. **Acknowledge honest model selection**: Where a simple baseline performs better than a gradient-boosted tree (as observed in the *Beauty* category), DemandIQ explicitly reports this reality rather than forcing a claim of improvement.

---

## 2. Dataset Temporal Structure & Chronological Split Strategy

The underlying dataset spans **48 consecutive calendar months** (January 2021 through December 2024) across 4 retail product categories (*Beauty*, *Clothing*, *Electronics*, *Home*).

### Chronological Splitting (No Random Shuffling)
Time-series forecasting cannot use random cross-validation, as future observations would bleed into training splits. DemandIQ applies a strict chronological hold-out evaluation:

| Split Phase | Time Period | Observation Count ($N$) | Percentage | Purpose |
| :--- | :--- | :---: | :---: | :--- |
| **Feature Warm-Up** | 2021-01 to 2021-03 | 3 months | — | Dropped solely for initial $t-1, t-2, t-3$ lag initialization. |
| **Chronological Train** | 2021-04 to 2024-03 | 36 months | **80.0%** | Fit baseline parameters and XGBoost decision trees. |
| **Chronological Test** | 2024-04 to 2024-12 | 9 months | **20.0%** | Completely untouched out-of-sample hold-out evaluation. |

*Total modeled observations per category:* 45 months (36 train + 9 test).  
*Multi-level Granularity Reconciliation:*
- **Raw Transaction Layer:** 8,048 multi-category customer transaction records in SQLite table `sales_records`.
- **Monthly SKU Layer:** 960 total monthly SKU observations across 48 months ($48 \times 20 \text{ SKUs} = 960$), partitioned into 60 warm-up ($3 \times 20$), 720 training ($36 \times 20$), and 180 test observations ($9 \times 20$).
- **Category Forecasting Layer:** 192 category-month observations ($48 \times 4 \text{ categories} = 192$), partitioned into 12 warm-up ($3 \times 4$), 144 training ($36 \times 4$), and 36 test observations ($9 \times 4$).

---

## 3. Feature Engineering & Strict Leakage Prevention

All features available at inference time ($t$) are derived exclusively from historical data preceding or known at target period $t$:

```mermaid
flowchart LR
    subgraph Past Observations [Available Historical Records]
        T3[Month t-3]
        T2[Month t-2]
        T1[Month t-1]
    end
    subgraph Known Calendar [Exogenous Calendar Features]
        M[Calendar Month Number 1-12]
        P[Planned Promotion Days]
        H[Scheduled Holiday Days]
        PR[Planned Average Price]
    end
    subgraph Leakage Guard [Strict Shift Barrier]
        LG[Excluded: Target Month Sales y_t]
    end
    subgraph Feature Set [Model Features X_t]
        F1[lag1 = y_t-1]
        F2[lag2 = y_t-2]
        F3["rolling3 = mean(y_t-1, y_t-2, y_t-3)"]
        F4[month_num]
        F5[promo_days]
        F6[holiday_days]
        F7[avg_price]
    end

    T1 --> F1
    T2 --> F2
    T1 & T2 & T3 --> F3
    M --> F4
    P --> F5
    H --> F6
    PR --> F7
    LG -.->|Blocked: Never Used| Feature Set
```

### Feature Dictionary & Invariant Schema

```json
{
  "version": "2.0.0",
  "target": "total_quantity",
  "target_description": "Total monthly demand units sold per product category",
  "features": [
    {"name": "month_num", "dtype": "int", "description": "Target calendar month (1-12) capturing annual cyclicality"},
    {"name": "avg_price", "dtype": "float", "description": "Average unit selling price in dollars"},
    {"name": "promo_days", "dtype": "int", "description": "Active promotional campaign days in target month"},
    {"name": "holiday_days", "dtype": "int", "description": "Recognized national/retail holiday days in target month"},
    {"name": "lag1", "dtype": "float", "description": "Autoregressive: total units sold in month t-1 (shift 1)"},
    {"name": "lag2", "dtype": "float", "description": "Autoregressive: total units sold in month t-2 (shift 2)"},
    {"name": "rolling3", "dtype": "float", "description": "Moving average: rolling 3-month mean strictly shifted by 1"}
  ]
}
```

### Data Leakage Prevention Proof
1. `lag1`: Derived via `total_quantity.shift(1)` &rarr; depends strictly on $t-1$.
2. `lag2`: Derived via `total_quantity.shift(2)` &rarr; depends strictly on $t-2$.
3. `rolling3`: Derived via `total_quantity.shift(1).rolling(3).mean()` &rarr; strictly evaluates $\frac{y_{t-1} + y_{t-2} + y_{t-3}}{3}$, preventing target $y_t$ from leaking into the rolling window.
4. Unit test [`test_feature_leakage_prevention`](file:///c:/Users/zmary/OneDrive/Desktop/product-demand-prediction/backend/tests/test_ml.py) verifies that altering target quantity $y_t$ leaves all features at index $t$ completely unchanged.

---

## 4. Candidate Models & Baseline Formulations

Every category forecast is evaluated against three established time-series baselines:

### 1. Naive Forecast (Lag-1)
$$\hat{y}_{t}^{\text{naive}} = y_{t-1}$$
*Rationale:* Assumes current demand continues unchanged into next month. Standard benchmark for non-trended random walks.

### 2. Seasonal-Naive Forecast (Lag-12)
$$\hat{y}_{t}^{\text{seasonal}} = y_{t-12}$$
*Rationale:* Assumes demand replicates the exact calendar month of the prior year. Standard benchmark for annual retail seasonality (e.g. holiday peaks). If a 12-month lag is unavailable, it gracefully defaults to $\text{lag1}$.

### 3. Moving Average Forecast (3-Month Rolling Mean)
$$\hat{y}_{t}^{\text{ma3}} = \frac{1}{3} \sum_{k=1}^3 y_{t-k}$$
*Rationale:* Smooths out short-term fluctuations and random monthly noise.

### 4. Primary Model: XGBoost Regressor
$$\hat{y}_{t}^{\text{xgb}} = f_{\text{XGBoost}}(\mathbf{x}_t)$$
*Hyperparameters:*
- `n_estimators`: 100
- `max_depth`: 3 (shallow trees prevent overfitting on short monthly sequences)
- `learning_rate`: 0.1
- `random_state`: 42
- `objective`: `reg:squarederror`

---

## 5. Evaluation Metrics Formulation

To provide realistic evaluation for supply chain and retail decision-making:

1. **Mean Absolute Error (MAE):**
   $$\text{MAE} = \frac{1}{N} \sum_{i=1}^N |y_i - \hat{y}_i|$$
   Measures average absolute unit error in physical inventory units.

2. **Root Mean Squared Error (RMSE):**
   $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N (y_i - \hat{y}_i)^2}$$
   Penalizes large outlier forecast errors heavily (critical for warehouse capacity planning).

3. **Safe Mean Absolute Percentage Error (MAPE):**
   $$\text{MAPE} = \frac{100}{N_{y>0}} \sum_{y_i > 0} \frac{|y_i - \hat{y}_i|}{y_i}$$
   Excludes zero actuals to prevent mathematical divide-by-zero or infinity blowups.

4. **Weighted Absolute Percentage Error (WAPE):**
   $$\text{WAPE} = \frac{\sum_{i=1}^N |y_i - \hat{y}_i|}{\sum_{i=1}^N y_i} \times 100\%$$
   The gold standard in supply chain forecasting. Weighs each absolute error by total actual category sales volume. Completely immune to zero-division distortion.

---

## 6. Experimental Benchmark Results

Evaluated across the **chronological hold-out test set** (9 months: April 2024 – December 2024, $N=9$ per category):

| Category | Model | MAE (Units) | RMSE (Units) | MAPE (%) | WAPE (%) | Preferred Model & Selection Finding |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Beauty** | **Moving Avg 3** | **56.26** | **65.60** | **15.36%** | **15.17%** | **Baseline (MA-3) WINS:** Lower error than XGBoost by 31.6% MAE. Smooth steady consumption favors rolling average. |
| | Seasonal-Naive | 82.78 | 89.46 | 21.82% | 22.32% | |
| | XGBoost | 82.24 | 94.54 | 21.20% | 22.17% | *Honest Reporting: XGBoost beats Naive slightly, but loses to MA-3.* |
| | Naive (Lag-1) | 84.56 | 99.25 | 22.42% | 22.80% | |
| **Clothing** | **XGBoost** | **37.18** | **43.43** | **10.28%** | **10.22%** | **XGBoost WINS:** Outperforms best baseline (Naive) by **21.6% lower MAE** and **21.6% lower WAPE**. Captures promo & seasonal lifts. |
| | Naive (Lag-1) | 47.44 | 53.08 | 13.36% | 13.04% | |
| | Moving Avg 3 | 49.44 | 56.94 | 13.81% | 13.59% | |
| | Seasonal-Naive | 62.11 | 75.26 | 16.84% | 17.07% | |
| **Electronics** | **XGBoost** | **24.40** | **26.83** | **9.92%** | **9.51%** | **XGBoost WINS:** Strongest performance. Outperforms Seasonal-Naive by **22.7% lower MAE** and **40.4% lower RMSE**. Heavy holiday/promo interaction. |
| | Seasonal-Naive | 31.56 | 45.00 | 11.86% | 12.29% | |
| | Naive (Lag-1) | 35.78 | 58.20 | 12.75% | 13.94% | |
| | Moving Avg 3 | 56.70 | 73.60 | 19.33% | 22.09% | |
| **Home** | **XGBoost** | **45.43** | **57.59** | **12.68%** | **13.15%** | **XGBoost WINS:** Outperforms best baseline (Seasonal-Naive) by **24.6% lower MAE** and **24.6% lower WAPE**. |
| | Seasonal-Naive | 60.22 | 69.22 | 17.53% | 17.43% | |
| | Naive (Lag-1) | 61.44 | 77.39 | 17.51% | 17.78% | |
| | Moving Avg 3 | 78.74 | 88.78 | 22.33% | 22.79% | |

---

## 7. Cross-Category Summary & Scorecard

### Overall Aggregate Performance (Averaged across all 4 categories)

| Model Architecture | Average MAE (Units) | Average RMSE (Units) | Average WAPE (%) | Win Count |
| :--- | :---: | :---: | :---: | :---: |
| **XGBoost Regressor** | **47.31** | **55.60** | **13.76%** | **3 / 4 Categories** |
| **Naive (Lag-1)** | 57.30 | 71.98 | 16.89% | 0 / 4 Categories |
| **Seasonal-Naive (Lag-12)** | 59.17 | 69.73 | 17.28% | 0 / 4 Categories |
| **Moving Average (3-Month)** | 60.28 | 71.23 | 18.41% | 1 / 4 Categories |

### Key Findings & Practical Insights
1. **Overall Superiority**: Across the entire catalog, XGBoost reduces average forecast error by **17.4% MAE compared to Naive** and **20.0% MAE compared to Seasonal-Naive**.
2. **Where XGBoost Excels**: In *Electronics*, *Clothing*, and *Home*, non-linear interactions between promotion days, holidays, price adjustments, and month cycles drive dramatic demand shifts that simple baselines fail to anticipate.
3. **Honest Baseline Transparency (The Beauty Case)**: In *Beauty*, demand follows smoother replenishment patterns with fewer promo spikes. The 3-month moving average dampens noise more effectively than gradient boosting trees, achieving a superior 15.17% WAPE (vs. 22.17% for XGBoost). DemandIQ reports this finding transparently in both the API response and user documentation.

---

## 8. Prediction Interval Quantification & Empirical Validation

To support inventory buffer planning, DemandIQ generates individualized prediction intervals:

$$\hat{y}_{t+1} \pm 1.96 \times s_{\text{test}}$$

where $s_{\text{test}}$ is the **out-of-sample hold-out test RMSE** ($s_{\text{test}} = \sqrt{\frac{1}{N_{\text{test}}} \sum (y_i - \hat{y}_i)^2}$).

### Measured Empirical Test Coverage:
- **Beauty:** 88.9% (8 of 9 test observations covered)
- **Clothing:** 100.0% (9 of 9 test observations covered)
- **Electronics:** 100.0% (9 of 9 test observations covered)
- **Home:** 88.9% (8 of 9 test observations covered)
- **Mean Empirical Coverage:** **94.4%** across all categories.

> [!NOTE]
> **No Blind 95% Guarantee**: DemandIQ documents this coverage as an *empirical observation* on past hold-out periods. In accordance with Section 6 guidelines, we explicitly disclaim guaranteed future coverage in the presence of unforeseen macroeconomic shocks or structural market breaks.

---

## 9. Model Artifact Persistence

All trained models and metadata are serialized to `saved_models/` as self-contained artifacts:

```
backend/saved_models/
├── model_Beauty.pkl
├── model_Clothing.pkl
├── model_Electronics.pkl
└── model_Home.pkl
```

Each pickle file contains:
- `model`: Trained `xgb.XGBRegressor` instance
- `residual_std`: Out-of-sample holdout test RMSE ($s_{\text{test}}$)
- `metrics`: MAE, RMSE, MAPE, WAPE, baseline comparison, and validation series
- `feature_schema`: Exact feature names, order, data types, and documentation
- `model_version`: `"2.0.0"`
- `trained_at`: UTC ISO timestamp
