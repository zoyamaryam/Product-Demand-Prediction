import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import pandas as pd
from app.config import RAW_DATA_PATH
from app.db import init_db, SessionLocal, SalesRecord, Base, engine


def load_csv() -> pd.DataFrame:
    if not RAW_DATA_PATH.exists():
        raise FileNotFoundError(
            f"Could not find dataset at {RAW_DATA_PATH}. "
            f"Place retail_demand_cleaned.csv in backend/data/raw/"
        )
    df = pd.read_csv(RAW_DATA_PATH, parse_dates=["order_date"])
    print(f"Loaded {len(df)} rows from {RAW_DATA_PATH}")
    return df


def load_into_db(df: pd.DataFrame):
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        db.query(SalesRecord).delete()

        for _, row in df.iterrows():
            record = SalesRecord(
                order_id=int(row["order_id"]),
                order_date=row["order_date"].date(),
                customer_id=int(row["customer_id"]),
                sku_id=row["sku_id"],
                product_name=row["product_name"],
                product_category=row["product_category"],
                region=row["region"],
                quantity=int(row["quantity"]),
                demand_target=int(row["demand_target"]),
                unit_price=float(row["unit_price"]),
                discount=float(row["discount"]),
                promotion_flag=bool(row["promotion_flag"]),
                revenue=float(row["revenue"]),
                payment_method=row["payment_method"],
                delivery_days=int(row["delivery_days"]),
                customer_rating=float(row["customer_rating"]),
                year=int(row["year"]),
                month=int(row["month"]),
                quarter=int(row["quarter"]),
                week_of_year=int(row["week_of_year"]),
                day_of_week=row["day_of_week"],
                is_weekend=bool(row["is_weekend"]),
                season=row["season"],
                holiday_flag=bool(row["holiday_flag"]),
                holiday_name=row["holiday_name"],
                current_inventory=int(row["current_inventory"]),
                lead_time_days=int(row["lead_time_days"]),
                safety_stock=int(row["safety_stock"]),
                reorder_point=int(row["reorder_point"]),
                stockout_risk=bool(row["stockout_risk"]),
                overstock_risk=bool(row["overstock_risk"]),
                inventory_status=row["inventory_status"],
                recommended_reorder_qty=int(row["recommended_reorder_qty"]),
                category_demand_index=float(row["category_demand_index"]),
                net_unit_price=float(row["net_unit_price"]),
                inventory_gap_to_reorder=int(row["inventory_gap_to_reorder"]),
                inventory_coverage_ratio=float(row["inventory_coverage_ratio"]),
                is_synthetic=bool(row.get("is_synthetic", True)),
                data_source=str(row.get("data_source", "DemandIQ_Synthetic_Retail_v2")),
            )
            db.add(record)

        db.commit()
        print(f"Loaded {len(df)} rows into the database.")
    finally:
        db.close()


if __name__ == "__main__":
    if "--generate" in sys.argv:
        from generate_dataset import generate_synthetic_dataset
        print("Generating fresh reproducible synthetic dataset...")
        generate_synthetic_dataset(output_path=RAW_DATA_PATH)
    df = load_csv()
    load_into_db(df)