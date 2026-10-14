# DemandIQ 2.0 — Data Dictionary & Dataset Specification

## 1. Executive Notice & Synthetic Data Disclosure

> [!IMPORTANT]
> **SYNTHETIC DATA DISCLAIMER**
> The records contained in this dataset (`retail_demand_cleaned.csv` and SQLite table `sales_records`) are **100% synthetically generated** for demonstration, research, and validation of the DemandIQ 2.0 forecasting and inventory decision-support platform. 
> 
> - Every record is explicitly tagged with `is_synthetic = 1` (`True`) and `data_source = "DemandIQ_Synthetic_Retail_v2"`.
> - **These records must NEVER be described, marketed, or interpreted as genuine retailer sales, real proprietary point-of-sale data, or actual consumer behavior.**
> - The dataset is deterministic and fully reproducible via `backend/generate_dataset.py` (fixed seed: `42`).

---

## 2. Dataset Overview

| Attribute | Specification |
| :--- | :--- |
| **Dataset Title** | DemandIQ Synthetic Retail Prototype Dataset v2.0 |
| **File Location** | `backend/data/raw/retail_demand_cleaned.csv` |
| **Database Target** | SQLite table: `sales_records` (`backend/data/processed/app.db`) |
| **Granularity** | Transaction-level order record per active SKU |
| **Time Horizon** | 48 consecutive months (January 1, 2021 – December 31, 2024) |
| **Minimum Required Months** | >= 36 consecutive months (Satisfies Section 3) |
| **Product Breadth** | 20 distinct products across 4 core retail categories |
| **Record Volume** | 8,048 raw transaction rows (aggregated to 960 monthly SKU observations across 48 months, including 720 observations in the 36-month training split) |
| **Primary Keys** | `order_id` (Unique transaction integer), `id` (Auto-increment SQL PK) |

---

## 3. Product Catalog & Stable SKU Mapping

DemandIQ 2.0 enforces a strict 1-to-1 mapping between `sku_id` and `product_name`. All 20 items have stable, predictable supply chain profiles:

| SKU ID | Product Name | Category | Base Unit Price ($) | Base Daily Demand | Supplier Lead Time (Days) | Safety Stock Buffer (Units) | Reorder Point (Units) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `BEAUTY001` | Face Serum | Beauty | $54.00 | 5 | 5 | 14 | 35 |
| `BEAUTY002` | Moisturizer | Beauty | $34.00 | 6 | 4 | 15 | 38 |
| `BEAUTY003` | Shampoo | Beauty | $22.00 | 8 | 3 | 18 | 42 |
| `BEAUTY004` | Perfume | Beauty | $89.00 | 4 | 7 | 10 | 28 |
| `BEAUTY005` | Sunscreen | Beauty | $28.00 | 6 | 4 | 16 | 36 |
| `CLOTH001` | T-Shirt | Clothing | $29.00 | 9 | 5 | 20 | 50 |
| `CLOTH002` | Jeans | Clothing | $68.00 | 6 | 6 | 16 | 44 |
| `CLOTH003` | Jacket | Clothing | $135.00 | 4 | 8 | 12 | 32 |
| `CLOTH004` | Sneakers | Clothing | $95.00 | 5 | 7 | 15 | 40 |
| `CLOTH005` | Hoodie | Clothing | $58.00 | 6 | 5 | 15 | 38 |
| `ELEC001` | Wireless Headphones | Electronics | $149.00 | 5 | 6 | 15 | 36 |
| `ELEC002` | Smartphone | Electronics | $799.00 | 3 | 10 | 10 | 26 |
| `ELEC003` | Laptop | Electronics | $1,099.00 | 3 | 12 | 8 | 24 |
| `ELEC004` | Smart Watch | Electronics | $249.00 | 4 | 7 | 12 | 30 |
| `ELEC005` | Bluetooth Speaker | Electronics | $79.00 | 5 | 5 | 14 | 34 |
| `HOME001` | Bed Sheet Set | Home | $52.00 | 5 | 5 | 14 | 34 |
| `HOME002` | Table Lamp | Home | $42.00 | 5 | 6 | 14 | 35 |
| `HOME003` | Cookware Set | Home | $149.00 | 4 | 8 | 12 | 32 |
| `HOME004` | Storage Organizer | Home | $29.00 | 7 | 4 | 18 | 42 |
| `HOME005` | Cushion Set | Home | $36.00 | 5 | 4 | 14 | 32 |

---

## 4. Complete Schema & Field Definitions

### 4.1 Transaction & Product Identifiers

| Column Name | SQL Type | Pandas Type | Nullable | Domain / Example | Generation Logic | Business Significance |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `order_id` | `INTEGER` | `int64` | No | 10001, 10002... | Incremental sequential integer | Unique identifier for the order transaction. |
| `order_date` | `DATE` | `object` / `datetime64[ns]` | No | 2021-01-01 to 2024-12-31 | Daily calendar simulation | Enables chronological indexing and time-series aggregation. |
| `customer_id` | `INTEGER` | `int64` | No | 1000 – 9999 | Hash-wrapped customer counter | Simulates distinct retail buyers. |
| `sku_id` | `VARCHAR` | `object` | No | `BEAUTY001` - `HOME005` | Fixed SKU string | Stock Keeping Unit identifier for catalog mapping. |
| `product_name` | `VARCHAR` | `object` | No | "Face Serum", "Laptop" | Catalog lookup | Human-readable merchandise name. |
| `product_category` | `VARCHAR` | `object` | No | "Beauty", "Clothing", "Electronics", "Home" | Catalog lookup | Category partition for ML models and KPI filtering. |
| `region` | `VARCHAR` | `object` | No | "North", "South", "East", "West" | Random discrete choice | Geographical fulfillment region. |

### 4.2 Demand, Pricing & Financials

| Column Name | SQL Type | Pandas Type | Nullable | Domain / Example | Generation Logic | Business Significance |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `quantity` | `INTEGER` | `int64` | No | 1 – 40+ units | $\max(1, \text{round}(\text{base} \times \text{season} \times \text{promo} + \epsilon))$ | Total product units ordered in this transaction. |
| `demand_target` | `INTEGER` | `int64` | No | Equals `quantity` | Direct copy of realized units sold | Supervised machine learning regression target. |
| `unit_price` | `FLOAT` | `float64` | No | $15.00 – $1,200.00 | Base price with mild stochastic variance | List price per unit prior to discount. |
| `discount` | `FLOAT` | `float64` | No | 0.00 to 0.30 (0% – 30%) | Sampled uniform when promo is active; else 0.0 | Promotional markdown applied to the item. |
| `promotion_flag` | `BOOLEAN` | `int64` (0/1) | No | 0 or 1 | 1 on promotional days; 0 otherwise | Key feature indicating marketing/discount campaign. |
| `net_unit_price` | `FLOAT` | `float64` | No | Unit price after discount | $\text{round}(\text{unit\_price} \times (1 - \text{discount}), 2)$ | Actual realized unit price paid by customer. |
| `revenue` | `FLOAT` | `float64` | No | $\ge \$0.00$ | $\text{round}(\text{quantity} \times \text{net\_unit\_price}, 2)$ | Net top-line revenue generated by transaction. |
| `payment_method` | `VARCHAR` | `object` | No | "Card", "UPI", "Wallet", "COD" | Discrete uniform choice | Checkout payment tender. |
| `delivery_days` | `INTEGER` | `int64` | No | 2 – 9 days | Simulated courier transit time | Customer fulfillment duration. |
| `customer_rating` | `FLOAT` | `float64` | No | 3.0 – 5.0 | Simulated post-order feedback score | Satisfaction barometer. |

### 4.3 Calendar, Temporal & Seasonality Attributes

| Column Name | SQL Type | Pandas Type | Nullable | Domain / Example | Generation Logic | Business Significance |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `year` | `INTEGER` | `int64` | No | 2021, 2022, 2023, 2024 | `order_date.year` | Year-over-year (YoY) slicing and chronological partitioning. |
| `month` | `INTEGER` | `int64` | No | 1 – 12 | `order_date.month` | Month-of-year cyclical seasonality feature. |
| `quarter` | `INTEGER` | `int64` | No | 1 – 4 | `(month - 1) // 3 + 1` | Fiscal quarter aggregation. |
| `week_of_year` | `INTEGER` | `int64` | No | 1 – 53 | ISO calendar week | High-resolution weekly demand profiling. |
| `day_of_week` | `VARCHAR` | `object` | No | "Monday" – "Sunday" | `order_date.strftime('%A')` | Weekly intra-cycle pattern analysis. |
| `is_weekend` | `BOOLEAN` | `int64` (0/1) | No | 0 or 1 | 1 if Saturday or Sunday | Weekend shopping surge indicator. |
| `season` | `VARCHAR` | `object` | No | "Winter", "Spring", "Summer", "Fall" | Meteorological calendar mapping | High-level seasonal demand stratification. |
| `holiday_flag` | `BOOLEAN` | `int64` (0/1) | No | 0 or 1 | 1 on defined major holidays | Holiday surge flag for model feature engineering. |
| `holiday_name` | `VARCHAR` | `object` | No | "Black Friday", "Christmas", "No Holiday" | Holiday calendar mapping | Specific calendar event description. |

### 4.4 Inventory Operations & Supply Chain Risk

| Column Name | SQL Type | Pandas Type | Nullable | Domain / Example | Generation Logic | Business Significance |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `current_inventory` | `INTEGER` | `int64` | No | $\ge 0$ units | Simulated stock depletion and periodic replenishment | Current on-hand warehouse inventory at transaction time. |
| `lead_time_days` | `INTEGER` | `int64` | No | 3 – 12 days | Fixed catalog supplier lead time | Replenishment delay from purchase order to warehouse receipt. |
| `safety_stock` | `INTEGER` | `int64` | No | $\ge 0$ units | Catalog safety stock buffer | Buffer designed to absorb lead-time variance and demand spikes. |
| `reorder_point` | `INTEGER` | `int64` | No | $\ge \text{safety\_stock}$ | Lead-time demand + safety stock | Inventory threshold triggering a new procurement order. |
| `stockout_risk` | `BOOLEAN` | `int64` (0/1) | No | 0 or 1 | 1 if `current_inventory < safety_stock` | Critical operational risk flag requiring immediate attention. |
| `overstock_risk` | `BOOLEAN` | `int64` (0/1) | No | 0 or 1 | 1 if `current_inventory > reorder_point * 1.8` | Working capital tie-up risk flag prompt for promotion/markdown. |
| `inventory_status` | `VARCHAR` | `object` | No | "Critical Stockout", "Reorder Required", "Healthy", "Overstock" | Rule-based categorical classification | Human-readable operational health summary for the shop owner. |
| `recommended_reorder_qty` | `INTEGER` | `int64` | No | $\ge 0$ units | $\max(0, \text{Target Stock} - \text{Current Inventory})$ | Prescriptive order suggestion (0 when stock is healthy/overstocked). |
| `category_demand_index`| `FLOAT` | `float64` | No | Positive float | Relative baseline demand score | Category-wide velocity benchmark. |
| `inventory_gap_to_reorder` | `INTEGER` | `int64` | No | Negative or positive integer | `current_inventory - reorder_point` | Buffer margin relative to the replenishment trigger. |
| `inventory_coverage_ratio` | `FLOAT` | `float64` | No | $\ge 0.0$ | $\text{round}(\text{current\_inventory} / \text{reorder\_point}, 3)$ | Ratio indicating how many replenishment cycles are covered. |

### 4.5 Synthetic Auditing & Provenance Metadata

| Column Name | SQL Type | Pandas Type | Nullable | Domain / Example | Generation Logic | Business Significance |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `is_synthetic` | `BOOLEAN` | `int64` (0/1) | No | 1 (`True`) | Always 1 for synthetic prototype records | Strict compliance guard ensuring synthetic origin is unmistakable. |
| `data_source` | `VARCHAR` | `object` | No | "DemandIQ_Synthetic_Retail_v2" | String tag | Audit trail distinguishing synthetic demo data from future POS feeds. |

---

## 5. Mathematical Integrity & Validation Invariants

All synthetic data generation and ETL ingestion must satisfy the following strict invariants without exception:

1. **Non-negativity Invariant**:
   $$\text{quantity} > 0, \quad \text{unit\_price} > 0, \quad \text{current\_inventory} \ge 0, \quad \text{lead\_time\_days} > 0, \quad \text{revenue} \ge 0$$
2. **Pricing & Discount Invariant**:
   $$\text{net\_unit\_price} = \text{round}(\text{unit\_price} \times (1.0 - \text{discount}), 2)$$
   $$\text{revenue} = \text{round}(\text{quantity} \times \text{net\_unit\_price}, 2)$$
3. **Inventory Reorder Consistency**:
   - If $\text{current\_inventory} > \text{reorder\_point}$, then $\text{recommended\_reorder\_qty} = 0$.
   - $\text{recommended\_reorder\_qty} \ge 0$ (negative order quantities are strictly disallowed).
4. **Temporal Continuity**:
   - The dataset must contain uninterrupted monthly data across at least 36 consecutive months (DemandIQ 2.0 provides 48 full months: 2021-01 through 2024-12).
   - Zero missing months or out-of-order date corruptions.
5. **Catalog Integrity**:
   - Exactly 20 distinct products.
   - Each SKU ID maps to exactly 1 product name and exactly 1 category.
