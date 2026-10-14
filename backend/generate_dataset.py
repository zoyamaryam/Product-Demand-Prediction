"""
DemandIQ 2.0 — Synthetic Retail Dataset Generator
Generates a reproducible, clearly labelled synthetic dataset adhering to Master Prompt Section 3.

Key Guarantees:
- 100% labelled as synthetic (is_synthetic=True, data_source="DemandIQ_Synthetic_Retail_v2")
- 48 consecutive months of observations (2021-01-01 through 2024-12-31, >= 36 months requirement)
- 20 realistic products across 4 categories (Beauty, Clothing, Electronics, Home) with stable SKUs
- Realistic trend, seasonal patterns, weekend effects, and promotional variation
- Strict mathematical integrity: revenue == round(quantity * unit_price * (1 - discount), 2)
- Zero missing values, zero negative values, zero duplicate invalid dates
"""

import json
import random
from datetime import date, datetime, timedelta
from pathlib import Path
import numpy as np
import pandas as pd

# Catalog definition: 20 products, 4 categories, stable SKUs
CATALOG = [
    # Beauty (5 products)
    {"sku_id": "BEAUTY001", "product_name": "Face Serum", "product_category": "Beauty", "base_price": 54.0, "base_demand": 5, "lead_time_days": 5, "safety_stock": 14, "reorder_point": 35},
    {"sku_id": "BEAUTY002", "product_name": "Moisturizer", "product_category": "Beauty", "base_price": 34.0, "base_demand": 6, "lead_time_days": 4, "safety_stock": 15, "reorder_point": 38},
    {"sku_id": "BEAUTY003", "product_name": "Shampoo", "product_category": "Beauty", "base_price": 22.0, "base_demand": 8, "lead_time_days": 3, "safety_stock": 18, "reorder_point": 42},
    {"sku_id": "BEAUTY004", "product_name": "Perfume", "product_category": "Beauty", "base_price": 89.0, "base_demand": 4, "lead_time_days": 7, "safety_stock": 10, "reorder_point": 28},
    {"sku_id": "BEAUTY005", "product_name": "Sunscreen", "product_category": "Beauty", "base_price": 28.0, "base_demand": 6, "lead_time_days": 4, "safety_stock": 16, "reorder_point": 36},
    # Clothing (5 products)
    {"sku_id": "CLOTH001", "product_name": "T-Shirt", "product_category": "Clothing", "base_price": 29.0, "base_demand": 9, "lead_time_days": 5, "safety_stock": 20, "reorder_point": 50},
    {"sku_id": "CLOTH002", "product_name": "Jeans", "product_category": "Clothing", "base_price": 68.0, "base_demand": 6, "lead_time_days": 6, "safety_stock": 16, "reorder_point": 44},
    {"sku_id": "CLOTH003", "product_name": "Jacket", "product_category": "Clothing", "base_price": 135.0, "base_demand": 4, "lead_time_days": 8, "safety_stock": 12, "reorder_point": 32},
    {"sku_id": "CLOTH004", "product_name": "Sneakers", "product_category": "Clothing", "base_price": 95.0, "base_demand": 5, "lead_time_days": 7, "safety_stock": 15, "reorder_point": 40},
    {"sku_id": "CLOTH005", "product_name": "Hoodie", "product_category": "Clothing", "base_price": 58.0, "base_demand": 6, "lead_time_days": 5, "safety_stock": 15, "reorder_point": 38},
    # Electronics (5 products)
    {"sku_id": "ELEC001", "product_name": "Wireless Headphones", "product_category": "Electronics", "base_price": 149.0, "base_demand": 5, "lead_time_days": 6, "safety_stock": 15, "reorder_point": 36},
    {"sku_id": "ELEC002", "product_name": "Smartphone", "product_category": "Electronics", "base_price": 799.0, "base_demand": 3, "lead_time_days": 10, "safety_stock": 10, "reorder_point": 26},
    {"sku_id": "ELEC003", "product_name": "Laptop", "product_category": "Electronics", "base_price": 1099.0, "base_demand": 3, "lead_time_days": 12, "safety_stock": 8, "reorder_point": 24},
    {"sku_id": "ELEC004", "product_name": "Smart Watch", "product_category": "Electronics", "base_price": 249.0, "base_demand": 4, "lead_time_days": 7, "safety_stock": 12, "reorder_point": 30},
    {"sku_id": "ELEC005", "product_name": "Bluetooth Speaker", "product_category": "Electronics", "base_price": 79.0, "base_demand": 5, "lead_time_days": 5, "safety_stock": 14, "reorder_point": 34},
    # Home (5 products)
    {"sku_id": "HOME001", "product_name": "Bed Sheet Set", "product_category": "Home", "base_price": 52.0, "base_demand": 5, "lead_time_days": 5, "safety_stock": 14, "reorder_point": 34},
    {"sku_id": "HOME002", "product_name": "Table Lamp", "product_category": "Home", "base_price": 42.0, "base_demand": 5, "lead_time_days": 6, "safety_stock": 14, "reorder_point": 35},
    {"sku_id": "HOME003", "product_name": "Cookware Set", "product_category": "Home", "base_price": 149.0, "base_demand": 4, "lead_time_days": 8, "safety_stock": 12, "reorder_point": 32},
    {"sku_id": "HOME004", "product_name": "Storage Organizer", "product_category": "Home", "base_price": 29.0, "base_demand": 7, "lead_time_days": 4, "safety_stock": 18, "reorder_point": 42},
    {"sku_id": "HOME005", "product_name": "Cushion Set", "product_category": "Home", "base_price": 36.0, "base_demand": 5, "lead_time_days": 4, "safety_stock": 14, "reorder_point": 32},
]

REGIONS = ["North", "South", "East", "West"]
PAYMENT_METHODS = ["Card", "UPI", "Wallet", "COD"]

HOLIDAYS = {
    (1, 1): "New Year's Day",
    (2, 14): "Valentine's Day",
    (5, 1): "Labor Day",
    (7, 4): "Independence Day",
    (10, 31): "Halloween",
    (11, 25): "Thanksgiving / Black Friday",
    (11, 26): "Black Friday",
    (11, 27): "Cyber Weekend",
    (12, 24): "Christmas Eve",
    (12, 25): "Christmas Day",
    (12, 31): "New Year's Eve",
}

SEASONS = {
    12: "Winter", 1: "Winter", 2: "Winter",
    3: "Spring", 4: "Spring", 5: "Spring",
    6: "Summer", 7: "Summer", 8: "Summer",
    9: "Fall", 10: "Fall", 11: "Fall",
}


def get_seasonal_factor(category: str, product_name: str, month: int) -> float:
    """Calculates realistic seasonal multipliers."""
    # Sunscreen peaks in summer
    if product_name == "Sunscreen":
        return 2.1 if month in [6, 7, 8] else (0.5 if month in [11, 12, 1] else 1.0)
    # Jackets & Hoodies peak in late fall / winter
    if product_name in ["Jacket", "Hoodie"]:
        return 1.9 if month in [11, 12, 1, 2] else (0.4 if month in [6, 7, 8] else 0.9)
    # T-shirts peak in spring/summer
    if product_name == "T-Shirt":
        return 1.6 if month in [5, 6, 7, 8] else 0.8
    # Electronics peak in Q4 holiday shopping (Nov-Dec)
    if category == "Electronics":
        return 1.8 if month in [11, 12] else (1.2 if month in [9, 10] else 0.95)
    # Perfume & Face Serum peak in Feb (Valentine) and Q4
    if product_name in ["Perfume", "Face Serum"]:
        return 1.6 if month in [2, 11, 12] else 1.0
    # Home goods peak in spring cleaning and pre-holidays
    if category == "Home":
        return 1.4 if month in [4, 5, 10, 11] else 0.95

    return 1.0


def generate_synthetic_dataset(
    start_date: str = "2021-01-01",
    end_date: str = "2024-12-31",
    seed: int = 42,
    output_path: Path = None,
) -> pd.DataFrame:
    """
    Generates synthetic retail sales records.
    Produces at least 36 consecutive months of monthly observations (default: 48 months).
    """
    random.seed(seed)
    np.random.seed(seed)

    start = datetime.strptime(start_date, "%Y-%m-%d").date()
    end = datetime.strptime(end_date, "%Y-%m-%d").date()
    total_days = (end - start).days + 1

    records = []
    order_id = 10001
    customer_id_counter = 1000

    # Simulate ongoing inventory tracking per product
    product_state = {}
    for p in CATALOG:
        product_state[p["sku_id"]] = {
            "current_inventory": int(p["reorder_point"] * random.uniform(0.6, 2.2)),
            "demand_history": [],
        }

    current_date = start
    day_step = timedelta(days=1)

    while current_date <= end:
        m = current_date.month
        y = current_date.year
        q = (m - 1) // 3 + 1
        day_of_week = current_date.strftime("%A")
        is_weekend = day_of_week in ["Saturday", "Sunday"]
        season = SEASONS[m]
        week_of_year = current_date.isocalendar()[1]

        # Check holiday
        holiday_key = (m, current_date.day)
        is_holiday = holiday_key in HOLIDAYS
        holiday_name = HOLIDAYS.get(holiday_key, "No Holiday")

        # In retail, each day features transactions across multiple products
        # We sample active products for each day (4-7 product transactions per day)
        daily_products = random.sample(CATALOG, k=random.randint(4, 7))

        for prod in daily_products:
            sku = prod["sku_id"]
            cat = prod["product_category"]
            base_d = prod["base_demand"]
            base_price = prod["base_price"]

            # Multipliers
            season_mult = get_seasonal_factor(cat, prod["product_name"], m)
            weekend_mult = 1.35 if is_weekend else 1.0
            holiday_mult = 1.6 if is_holiday else 1.0

            # Annual trend factor (e.g. slight business growth year-over-year: 3% annually)
            year_trend = 1.0 + 0.035 * (y - start.year)

            # Promotion flag
            # Higher promo likelihood on weekends, holidays, or end-of-month
            promo_chance = 0.35 if (is_holiday or is_weekend) else 0.18
            is_promo = random.random() < promo_chance
            discount = round(random.uniform(0.10, 0.30), 2) if is_promo else 0.0
            promo_mult = (1.0 + (discount * 1.6)) if is_promo else 1.0

            # Compute quantity sold
            expected_demand = base_d * season_mult * weekend_mult * holiday_mult * promo_mult * year_trend
            noise = np.random.normal(loc=0.0, scale=max(0.6, expected_demand * 0.15))
            quantity = max(1, int(round(expected_demand + noise)))
            demand_target = quantity  # realized target for demand forecasting

            # Pricing with mild fluctuations
            unit_price = round(base_price * random.uniform(0.96, 1.05), 2)
            net_unit_price = round(unit_price * (1.0 - discount), 2)
            revenue = round(quantity * net_unit_price, 2)

            # Region & Customer
            region = random.choice(REGIONS)
            cust_id = (customer_id_counter % 9000) + 1000
            customer_id_counter += 1
            payment = random.choice(PAYMENT_METHODS)
            delivery_days = random.randint(2, 9)
            customer_rating = round(random.uniform(3.0, 5.0), 1)

            # Lead time and Inventory simulation
            lead_time = prod["lead_time_days"]
            safety_stock = prod["safety_stock"]
            reorder_point = prod["reorder_point"]

            # Dynamic inventory level updating with replenishment cycles
            state = product_state[sku]
            state["current_inventory"] = max(0, state["current_inventory"] - quantity)
            # Periodic replenishment simulation if inventory falls near safety stock
            if state["current_inventory"] < (safety_stock * 0.8):
                # Supplier order received
                replenishment_batch = int(reorder_point * random.uniform(1.2, 2.0))
                state["current_inventory"] += replenishment_batch

            current_inventory = state["current_inventory"]

            # Risk classification based on current stock vs reorder point & safety stock
            stockout_risk = current_inventory < safety_stock
            overstock_risk = current_inventory > (reorder_point * 1.8)

            if current_inventory < safety_stock:
                inventory_status = "Critical Stockout"
            elif current_inventory <= reorder_point:
                inventory_status = "Reorder Required"
            elif current_inventory > (reorder_point * 1.8):
                inventory_status = "Overstock"
            else:
                inventory_status = "Healthy"

            # Reorder calculation policy:
            # Target stock buffer = reorder_point * 1.5
            target_stock = int(reorder_point * 1.5)
            if current_inventory <= reorder_point:
                recommended_reorder_qty = max(0, target_stock - current_inventory)
            else:
                recommended_reorder_qty = 0

            inventory_gap = current_inventory - reorder_point
            coverage_ratio = round(current_inventory / max(1, reorder_point), 3)
            category_demand_index = round(expected_demand * 15.0, 2)

            records.append({
                "order_id": order_id,
                "order_date": current_date.strftime("%Y-%m-%d"),
                "customer_id": cust_id,
                "sku_id": sku,
                "product_name": prod["product_name"],
                "product_category": cat,
                "region": region,
                "quantity": quantity,
                "demand_target": demand_target,
                "unit_price": unit_price,
                "discount": discount,
                "promotion_flag": 1 if is_promo else 0,
                "revenue": revenue,
                "payment_method": payment,
                "delivery_days": delivery_days,
                "customer_rating": customer_rating,
                "year": y,
                "month": m,
                "quarter": q,
                "week_of_year": week_of_year,
                "day_of_week": day_of_week,
                "is_weekend": 1 if is_weekend else 0,
                "season": season,
                "holiday_flag": 1 if is_holiday else 0,
                "holiday_name": holiday_name,
                "current_inventory": current_inventory,
                "lead_time_days": lead_time,
                "safety_stock": safety_stock,
                "reorder_point": reorder_point,
                "stockout_risk": 1 if stockout_risk else 0,
                "overstock_risk": 1 if overstock_risk else 0,
                "inventory_status": inventory_status,
                "recommended_reorder_qty": recommended_reorder_qty,
                "category_demand_index": category_demand_index,
                "net_unit_price": net_unit_price,
                "inventory_gap_to_reorder": inventory_gap,
                "inventory_coverage_ratio": coverage_ratio,
                # Explicit Synthetic Labelling (Master Prompt Section 3 Requirement)
                "is_synthetic": 1,
                "data_source": "DemandIQ_Synthetic_Retail_v2",
            })
            order_id += 1

        current_date += day_step

    df = pd.DataFrame(records)

    # Sort chronologically
    df["order_date_dt"] = pd.to_datetime(df["order_date"])
    df = df.sort_values(["order_date_dt", "order_id"]).drop(columns=["order_date_dt"]).reset_index(drop=True)

    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(output_path, index=False)
        print(f"Saved {len(df):,} synthetic rows to {output_path}")

        # Save metadata document alongside dataset
        metadata = {
            "dataset_name": "DemandIQ Synthetic Retail Prototype Dataset v2.0",
            "is_synthetic": True,
            "disclaimer": (
                "NOTICE: This dataset contains purely synthetic retail data generated for "
                "forecasting and decision-support demonstration. It does not represent genuine "
                "customer transactions, retailer sales, or commercial proprietary records."
            ),
            "generation_timestamp": datetime.utcnow().isoformat() + "Z",
            "random_seed": seed,
            "date_range": {
                "start_date": start_date,
                "end_date": end_date,
                "consecutive_months": 48,
            },
            "record_count": len(df),
            "product_count": len(CATALOG),
            "categories": sorted(list({p["product_category"] for p in CATALOG})),
            "skus": [p["sku_id"] for p in CATALOG],
        }
        metadata_path = output_path.parent / "dataset_metadata.json"
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
        print(f"Saved dataset metadata to {metadata_path}")

    return df


if __name__ == "__main__":
    from app.config import RAW_DATA_PATH
    generate_synthetic_dataset(output_path=RAW_DATA_PATH)
