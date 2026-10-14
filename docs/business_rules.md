# DemandIQ 2.0 — Business Rules & Decision-Support Specifications

**Document Version:** 2.0.0  
**Phase:** Phase 8 Prototype Validation  
**Date:** October 2026  
**Status:** Approved & Implemented  

---

## 1. Executive Summary & Purpose

DemandIQ 2.0 is an interactive retail demand forecasting and inventory decision-support platform designed for category planners, merchandisers, and shop operators. The platform is engineered to answer four fundamental business questions:

1. **What happened to my sales?** (Descriptive analytics, momentum, and volume trends)
2. **Why might demand be changing?** (Seasonality cycles, holiday lifts, promotional variation)
3. **What is likely to happen next?** (Category demand forecasts with parametric error bands)
4. **What action should I consider taking?** (Inventory replenishment advice, surplus warnings, markdown reviews)

To guarantee operational safety and business integrity, all metrics, recommendations, and natural-language explanations are strictly evidence-grounded and deterministically calculated from verified application data.

---

## 2. Synthetic Data Provenance & Temporal Framing

> [!IMPORTANT]
> **PROTOTYPE DATASET NOTICE**
> - The active dataset (`backend/data/raw/retail_demand_cleaned.csv` and SQLite table `sales_records`) is **100% synthetically generated** for prototype testing and decision-support demonstration.
> - **Date Boundaries:** The historical series covers exactly **48 consecutive months: January 1, 2021 through December 31, 2024**.
> - **Forecast Horizon:** Next-month predictions represent a **January 2025 Historical Prototype Forecast**, evaluated against the historical December 2024 baseline. **No screen, API response, or documentation may represent January 2025 predictions as current real-world sales for 2026.**
> - **Granularity Distinction:**
>   - *Operational Transaction Layer:* 8,048 multi-category customer transaction records spanning 2021–2024.
>   - *Analytical Monthly Training Layer:* 720 monthly SKU records across the 36-month chronological training split ($36 \text{ months} \times 20 \text{ SKUs} = 720$). Across all 48 months, there are 960 SKU-month records ($48 \times 20$) and 192 category-month records ($48 \times 4$).

---

## 3. Inventory Intelligence & Replenishment Policies

### 3.1 Policy Calculations

All replenishment suggestions are deterministic decision-support recommendations. **Automated purchasing is strictly disabled (`automated_ordering_enabled = false`). All orders require managerial approval.**

| Metric / Term | Symbol | Formula / Definition | Operational Purpose |
| :--- | :---: | :--- | :--- |
| **Current Inventory** | $I_{current}$ | Mean on-hand stock over recent 90-day window per category/SKU. | Baseline stock position. |
| **Forecast Demand** | $D_{forecast}$ | 1-month forward predicted demand units ($\hat{y}_{t+1}$) from XGBoost. | Projected monthly demand volume. |
| **Supplier Lead Time** | $L$ | Empirical average supplier delivery days (3–12 days in catalog). Where lead times are untracked, a **14-day default buffer** is applied. | Days required for supplier delivery. |
| **Lead-Time Demand** | $LTD$ | $LTD = D_{forecast} \times \left(\frac{L}{30.0}\right)$ | Estimated units consumed during vendor fulfillment. |
| **Safety Stock** | $SS$ | Established from historical monthly sales variance: $SS = Z \times \sigma_L$. | Buffer against unexpected demand spikes. |
| **Reorder Point** | $ROP$ | $ROP = LTD + SS$ | Threshold triggering replenishment evaluation. |
| **Confirmed Incoming** | $I_{incoming}$ | Untracked in prototype dataset; defaults to $0$ units (`incoming_inventory_tracked: false`). | Open purchase orders in transit. |
| **Net Available Stock** | $I_{net}$ | $I_{net} = I_{current} + I_{incoming} - LTD$ | Projected stock buffer after lead-time fulfillment. |
| **Target Stock Level** | $Target$ | $Target = D_{forecast} + SS$ | Ideal stock holding for 1-month forward cover. |
| **Suggested Reorder Qty** | $Q_{reorder}$ | If $I_{current} \le ROP$ or $I_{net} < SS$:<br>$Q_{reorder} = \max(0, \lceil Target - I_{current} - I_{incoming} \rceil)$<br>Else: $0$ | Advisory replenishment volume. |

### 3.2 Lead-Time Reconciliation

In earlier iterations (Phase 6), replenishment defaults utilized a simplified 14-day planning approximation when vendor delivery schedules were unrecorded. DemandIQ 2.0 reconciles this approximation with the underlying catalog:
- **Observed Product Lead Times:** The synthetic catalog records product-level vendor fulfillment times ranging from **3 to 12 days**:
  - *Beauty:* 3–7 days (category mean: ~4.6 days)
  - *Clothing:* 5–8 days (category mean: ~6.2 days)
  - *Electronics:* 5–12 days (category mean: ~8.0 days)
  - *Home:* 4–8 days (category mean: ~5.4 days)
- **Policy Rule:** The replenishment engine utilizes the category average lead time computed directly from the recent transaction records. The **14-day lead-time buffer** is retained as an explicit, conservative planning default in documentation and fallback scenarios when supplier lead times are missing or unrecorded.

### 3.3 Inventory Risk Classifications

1. **Critical Stockout Risk (High Severity):**
   - Trigger: $I_{current} \le LTD$ or $I_{current} == 0$.
   - Meaning: Current warehouse holdings cannot even cover expected demand during supplier delivery lead time. Stockout is imminent before replenishment arrives.
2. **Reorder Required (Medium / Low Severity):**
   - Trigger: $I_{current} \le ROP$ or $UpperCI > I_{current}$.
   - Meaning: Holdings are below the combined lead-time demand + safety buffer, or upper-interval demand could breach reserves.
3. **Surplus Overstock (Medium Severity):**
   - Trigger: $I_{current} > (UpperCI \times 1.5)$ and $I_{current} > (ROP \times 1.5)$.
   - Surplus Units: $\max(0, \text{round}(I_{current} - (D_{forecast} + SS)))$.
   - Meaning: On-hand inventory exceeds projected 30-day requirements by >2.5x, causing unnecessary capital lockup.
4. **Healthy (Normal):**
   - Trigger: Stock balances reside safely between $ROP$ and overstock thresholds.

---

## 4. Pricing & Promotional Insights

### 4.1 Empirical Price Elasticity

DemandIQ 2.0 computes price elasticity through empirical observation of historical transactions:

$$\epsilon = \frac{\% \Delta \text{ Demand}}{\% \Delta \text{ Realized Price}}$$

Categories with observed $|\epsilon| > 1.0$ (e.g. *Clothing* at $-1.42$, *Home* at $-1.28$) are classified as **Price Elastic**, where historical promotions coincided with substantial unit volume expansion.

### 4.2 Non-Causal Grounding & Disclaimers

> [!CAUTION]
> **CORRELATION VS. CAUSATION POLICY**
> - **Strict Non-Causal Framing:** All promotional lifts and price elasticities are reported strictly as **historical empirical associations**. The platform never claims that lowering prices or offering discounts will causally generate profit.
> - **Absence of Wholesale Costs & Margins:** The SQLite database tracks retail `unit_price`, `discount`, and `revenue`. **It does not record supplier wholesale invoices, freight costs, or cost of goods sold (COGS).**
> - Consequently, DemandIQ **cannot calculate gross profit margins or determine net-profit-optimal price points**.
> - Markdown prompts for overstocked categories are framed strictly as *capital clearance advisories* to recover working capital, not profit-maximization guarantees.

---

## 5. Structured AI Insights Engine

The Structured Insight Engine (`generate_structured_insights`) produces normalized, auditable business insights:

### 5.1 Insight Schema Contract
Every insight must contain:
1. `id`: Deterministic unique identifier (e.g., `INS-INV-CLOTHING-STOCKOUT`).
2. `title`: Concise business headline.
3. `category`: One of `demand_trend`, `seasonality`, `inventory_risk`, `pricing`, `forecast_limitations`.
4. `severity`: `CRITICAL`, `WARNING`, `MEDIUM`, or `INFORMATIONAL`.
5. `supporting_metrics`: Dictionary of genuine, verified numeric metrics with explicit units.
6. `target_category` & `target_period`: Scoped dimension and time period.
7. `recommendation`: Concrete, non-automated advisory action.
8. `data_source`: Underlying calculation or service method.
9. `evidence_quality`: Classification label (`HIGH_EMPIRICAL`, `MODEL_BENCHMARK`, `ESTIMATED_RUN_RATE`).
10. `limitations`: Explicit assumptions and boundaries.

### 5.2 Contradiction Prevention Rules
- A category classified under `stockout_risk` can **never** simultaneously emit an `overstock_surplus` insight.
- Categories with low seasonal variance (variance $< 5\%$) do not emit high-seasonality alerts.
- Insights are deduplicated by deterministic ID.

---

## 6. Business Assistant Engine

The conversational Business Assistant (`answer_business_question`) routes natural-language questions through a deterministic, data-grounded engine:

### 6.1 Supported Canonical Questions

| Canonical Question | Resolved Intent | Primary Data Service | Grounding Behavior |
| :--- | :--- | :--- | :--- |
| *"Which categories show the greatest inventory risk?"* | `inventory_risk` | `get_inventory_intelligence()` | Ranks categories by stockout severity; declares lead-time run-rates. |
| *"Which products need replenishment, and why?"* | `product_replenishment` | `get_inventory_intelligence()`, `get_product_inventory_status()` | Explains lead times, burn rates, and SKU reorder gaps; declares orders must be placed manually. |
| *"What demand patterns appear in the available history?"* | `demand_patterns` | `get_category_trends()`, `get_seasonality()` | Analyzes 2021–2024 trends, YoY momentum, and seasonality index. |
| *"What limitations should I consider when using these forecasts?"* | `forecast_limitations` | `get_model_benchmark()` | Details hold-out MAE/RMSE/WAPE, stationary assumptions, and baseline benchmarks. |
| *"What promotion and pricing patterns are observed?"* | `pricing_promotions` | `get_pricing_insights()` | Surfaces observational elasticity; disclaims causal profit guarantees and notes missing COGS. |
| *"Summarize the most important findings for a business review."* | `executive_review` | `get_executive_summary()`, `get_inventory_intelligence()` | Cross-domain briefing across revenue, trends, risks, and prototype cycle status. |

### 6.2 Guardrail & Exception Handling
- **Unavailable Data Inquiries:** Questions regarding supplier invoices, wholesale COGS, competitor pricing, customer PII, or dates past December 2024 return an explicit `UNAVAILABLE` declaration detailing dataset boundaries.
- **Ambiguous Inquiries:** Short, ambiguous prompts (e.g. *"price?"*, *"buy?"*, *"help"*) return an `AMBIGUOUS` response with a clarifying question.
- **Zero Fabrication:** The assistant only quotes verified metrics from backend services. If an LLM is enabled, it is restricted to formatting verified evidence payloads.
