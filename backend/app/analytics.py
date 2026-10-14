"""
DemandIQ 2.0 — Business Analytics, Trend & Seasonality Module
Implements Master Prompt Section 5 requirements:
- Descriptive Analytics (totals, growth, ASP, top/bottom performers)
- Diagnostic Analytics (period-over-period changes, promotion/holiday observational lifts, anomaly detection)
- Trend Analysis (growth rates, ranking by momentum, multi-period curves)
- Seasonality Analysis (monthly profiles, seasonal indices, weekday patterns, YoY comparisons, data sufficiency warnings)
- Interactive Slicing (category filters, start_date, end_date support across all routines)
"""

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from app.db import SalesRecord


def get_sales_dataframe(
    db: Session,
    category: str = None,
    start_date: str = None,
    end_date: str = None,
) -> pd.DataFrame:
    """Pull sales records into a pandas DataFrame with optional category and date filtering."""
    query = db.query(SalesRecord)

    if isinstance(category, str) and category.strip() and category.lower() != "all":
        query = query.filter(SalesRecord.product_category.ilike(category.strip()))

    records = query.all()
    if not records:
        return pd.DataFrame()

    data = [{
        "order_date": r.order_date,
        "sku_id": r.sku_id,
        "product_name": r.product_name,
        "product_category": r.product_category,
        "region": r.region,
        "quantity": r.quantity,
        "revenue": r.revenue,
        "unit_price": r.unit_price,
        "discount": r.discount if r.discount is not None else 0.0,
        "month": r.month,
        "year": r.year,
        "day_of_week": r.day_of_week,
        "is_weekend": r.is_weekend,
        "season": r.season,
        "holiday_flag": r.holiday_flag,
        "promotion_flag": r.promotion_flag,
        "current_inventory": r.current_inventory,
        "stockout_risk": r.stockout_risk,
        "overstock_risk": r.overstock_risk,
    } for r in records]

    df = pd.DataFrame(data)
    df["order_date"] = pd.to_datetime(df["order_date"])

    # Optional date bounds filtering
    if isinstance(start_date, str) and start_date.strip():
        df = df[df["order_date"] >= pd.to_datetime(start_date.strip())]
    if isinstance(end_date, str) and end_date.strip():
        df = df[df["order_date"] <= pd.to_datetime(end_date.strip())]

    if df.empty:
        return df

    df["year_month"] = df["order_date"].dt.to_period("M")

    # Exclude partial trailing month if any
    month_counts = df["year_month"].value_counts()
    if not month_counts.empty:
        complete_months = month_counts[month_counts.astype(float) >= month_counts.median() * 0.5].index
        df = df[df["year_month"].isin(complete_months)].copy()

    return df


def get_executive_summary(
    db: Session,
    category: str = None,
    start_date: str = None,
    end_date: str = None,
) -> dict:
    """
    Descriptive analytics: total revenue, total units, growth rates, ASP,
    top/bottom performing products, and distribution breakdown.
    """
    df = get_sales_dataframe(db, category=category, start_date=start_date, end_date=end_date)
    if df.empty:
        return {
            "total_revenue": 0.0,
            "total_quantity_sold": 0,
            "revenue_growth_pct": 0.0,
            "yoy_revenue_growth_pct": 0.0,
            "avg_selling_price": 0.0,
            "products_analyzed": 0,
            "stockout_risk_count": 0,
            "overstock_risk_count": 0,
            "latest_period": "N/A",
            "total_records": 0,
            "monthly_trend": [],
            "category_distribution": [],
            "best_performing_products": [],
            "worst_performing_products": [],
        }

    total_revenue = float(df["revenue"].sum())
    total_quantity = int(df["quantity"].sum())
    stockout_count = int(df["stockout_risk"].sum())
    overstock_count = int(df["overstock_risk"].sum())
    avg_selling_price = round(total_revenue / max(1, total_quantity), 2)

    # Monthly revenue & growth
    monthly_revenue = df.groupby("year_month")["revenue"].sum().sort_index()
    if len(monthly_revenue) >= 2:
        growth_pct = ((monthly_revenue.iloc[-1] - monthly_revenue.iloc[-2]) /
                       monthly_revenue.iloc[-2]) * 100
    else:
        growth_pct = 0.0

    # Year-over-year revenue growth for latest month (e.g. month M vs month M-12)
    yoy_growth_pct = 0.0
    if len(monthly_revenue) >= 13:
        latest_rev = monthly_revenue.iloc[-1]
        prior_year_rev = monthly_revenue.iloc[-13]
        if prior_year_rev > 0:
            yoy_growth_pct = ((latest_rev - prior_year_rev) / prior_year_rev) * 100

    monthly_stats = df.groupby("year_month").agg(
        revenue=("revenue", "sum"),
        quantity=("quantity", "sum")
    ).reset_index()

    monthly_trend = [
        {
            "period": str(row["year_month"]),
            "revenue": round(float(row["revenue"]), 2),
            "quantity": int(row["quantity"]),
        }
        for _, row in monthly_stats.iterrows()
    ]

    cat_stats = df.groupby("product_category").agg(
        revenue=("revenue", "sum"),
        quantity=("quantity", "sum")
    ).reset_index()

    tot_rev = cat_stats["revenue"].sum()
    category_distribution = [
        {
            "category": str(row["product_category"]),
            "revenue": round(float(row["revenue"]), 2),
            "quantity": int(row["quantity"]),
            "share_pct": round(float(row["revenue"] / tot_rev * 100), 1) if tot_rev else 0,
        }
        for _, row in cat_stats.iterrows()
    ]

    # Best-performing and worst-performing products by revenue
    product_totals = df.groupby(["product_name", "product_category", "sku_id"]).agg(
        revenue=("revenue", "sum"),
        quantity=("quantity", "sum"),
    ).reset_index()
    product_totals["avg_price"] = (product_totals["revenue"] / product_totals["quantity"]).round(2)
    product_totals = product_totals.sort_values("revenue", ascending=False)

    best_performing = [
        {
            "sku_id": str(r["sku_id"]),
            "product_name": str(r["product_name"]),
            "product_category": str(r["product_category"]),
            "revenue": round(float(r["revenue"]), 2),
            "quantity": int(r["quantity"]),
            "avg_price": round(float(r["avg_price"]), 2),
        }
        for _, r in product_totals.head(5).iterrows()
    ]

    worst_performing = [
        {
            "sku_id": str(r["sku_id"]),
            "product_name": str(r["product_name"]),
            "product_category": str(r["product_category"]),
            "revenue": round(float(r["revenue"]), 2),
            "quantity": int(r["quantity"]),
            "avg_price": round(float(r["avg_price"]), 2),
        }
        for _, r in product_totals.tail(5).sort_values("revenue", ascending=True).iterrows()
    ]

    latest_period = str(monthly_stats["year_month"].iloc[-1]) if not monthly_stats.empty else "N/A"
    return {
        "total_revenue": round(total_revenue, 2),
        "total_quantity_sold": total_quantity,
        "revenue_growth_pct": round(float(growth_pct), 2),
        "yoy_revenue_growth_pct": round(float(yoy_growth_pct), 2),
        "avg_selling_price": avg_selling_price,
        "products_analyzed": df["product_name"].nunique() if not df.empty else 0,
        "stockout_risk_count": stockout_count,
        "overstock_risk_count": overstock_count,
        "latest_period": latest_period,
        "total_records": len(df),
        "monthly_trend": monthly_trend,
        "category_distribution": category_distribution,
        "best_performing_products": best_performing,
        "worst_performing_products": worst_performing,
    }


def get_trending_products(
    db: Session,
    top_n: int = 5,
    category: str = None,
    start_date: str = None,
    end_date: str = None,
) -> dict:
    """
    Trend analysis: Month-over-month product momentum ranking.
    Identifies top accelerating, decelerating, and complete product momentum.
    """
    df = get_sales_dataframe(db, category=category, start_date=start_date, end_date=end_date)
    if df.empty:
        return {
            "latest_month": "N/A",
            "prior_month": "N/A",
            "trending_up": [],
            "trending_down": [],
            "ranked_products": [],
        }

    monthly = df.groupby(["product_name", "year_month"])["quantity"].sum().reset_index()

    latest_month = monthly["year_month"].max()
    prior_month = latest_month - 1

    latest = monthly[monthly["year_month"] == latest_month].set_index("product_name")["quantity"]
    prior = monthly[monthly["year_month"] == prior_month].set_index("product_name")["quantity"]

    comparison = pd.DataFrame({"latest": latest, "prior": prior}).fillna(0)
    comparison["growth_pct"] = ((comparison["latest"] - comparison["prior"]) /
                                 comparison["prior"].replace(0, 1)) * 100
    comparison["absolute_change"] = comparison["latest"] - comparison["prior"]

    cat_map = df.drop_duplicates("product_name").set_index("product_name")["product_category"].to_dict()
    sku_map = df.drop_duplicates("product_name").set_index("product_name")["sku_id"].to_dict()
    comparison["product_category"] = comparison.index.map(cat_map)
    comparison["sku_id"] = comparison.index.map(sku_map)

    comparison = comparison.sort_values("growth_pct", ascending=False)

    def classify_momentum(pct):
        if pct > 5.0:
            return "accelerating"
        elif pct < -5.0:
            return "decelerating"
        return "stable"

    comparison["trend_direction"] = comparison["growth_pct"].apply(classify_momentum)

    trending_up = comparison.head(top_n).reset_index().to_dict(orient="records")
    trending_down = comparison.tail(top_n).sort_values("growth_pct").reset_index().to_dict(orient="records")
    ranked_products = comparison.reset_index().to_dict(orient="records")

    return {
        "latest_month": str(latest_month),
        "prior_month": str(prior_month),
        "trending_up": trending_up,
        "trending_down": trending_down,
        "ranked_products": ranked_products,
    }


def get_category_trends(
    db: Session,
    category: str = None,
    start_date: str = None,
    end_date: str = None,
) -> list:
    """Category-level trend summary: total volume, revenue, and YoY growth."""
    df = get_sales_dataframe(db, category=category, start_date=start_date, end_date=end_date)
    if df.empty:
        return []

    yearly = df.groupby(["product_category", "year"]).agg(
        quantity=("quantity", "sum"),
        revenue=("revenue", "sum")
    ).reset_index()

    results = []
    for cat in yearly["product_category"].unique():
        cat_data = yearly[yearly["product_category"] == cat].sort_values("year")
        if len(cat_data) >= 2:
            first, last = cat_data.iloc[0], cat_data.iloc[-1]
            growth = ((last["quantity"] - first["quantity"]) / first["quantity"]) * 100 if first["quantity"] else 0
        else:
            growth = 0

        tot_q = int(cat_data["quantity"].sum())
        tot_r = float(cat_data["revenue"].sum())
        results.append({
            "category": cat,
            "total_quantity": tot_q,
            "total_revenue": round(tot_r, 2),
            "avg_unit_price": round(tot_r / max(1, tot_q), 2),
            "yoy_growth_pct": round(growth, 2),
        })

    return sorted(results, key=lambda x: x["yoy_growth_pct"], reverse=True)


def get_seasonality(
    db: Session,
    category: str = None,
    start_date: str = None,
    end_date: str = None,
) -> dict:
    """
    Seasonality analysis: monthly demand profiles, seasonal index (100 = neutral),
    day-of-week patterns, meteorological season breakdowns, YoY comparison matrix,
    and explicit warnings if data is insufficient (< 2 complete annual cycles).
    """
    df = get_sales_dataframe(db, category=category, start_date=start_date, end_date=end_date)

    if df.empty:
        return {
            "by_month": {},
            "by_day_of_week": {},
            "by_season": {},
            "seasonal_index": {},
            "holiday_avg_demand": 0.0,
            "normal_avg_demand": 0.0,
            "weekend_lift_pct": 0.0,
            "yoy_monthly_matrix": [],
            "data_sufficiency": {
                "status": "insufficient",
                "annual_cycles": 0,
                "warning": "No historical transactions found to establish seasonal profiles.",
            },
        }

    # Data sufficiency check: requires at least 2 full annual cycles (24 months)
    unique_months = df["year_month"].nunique()
    annual_cycles = round(unique_months / 12.0, 1)
    if annual_cycles < 2.0:
        sufficiency_status = "insufficient"
        warning_msg = (
            f"Insufficient historical data ({unique_months} months observed, {annual_cycles} cycles). "
            f"Reliable seasonal profiles require at least 2 full calendar years (24 months) to decouple "
            f"one-off demand fluctuations from cyclical seasonality."
        )
    else:
        sufficiency_status = "sufficient"
        warning_msg = None

    by_month = df.groupby("month")["quantity"].mean().round(2).to_dict()
    by_day_of_week = df.groupby("day_of_week")["quantity"].mean().round(2).to_dict()
    by_season = df.groupby("season")["quantity"].mean().round(2).to_dict()
    holiday_vs_normal = df.groupby("holiday_flag")["quantity"].mean().round(2).to_dict()

    # Calculate seasonal index (monthly average / overall monthly average * 100)
    overall_mean = df["quantity"].mean()
    seasonal_index = {}
    if overall_mean > 0:
        for m, avg_val in by_month.items():
            seasonal_index[str(m)] = round((avg_val / overall_mean) * 100, 1)

    # Weekend vs weekday lift
    weekend_mean = df[df["is_weekend"] == 1]["quantity"].mean()
    weekday_mean = df[df["is_weekend"] == 0]["quantity"].mean()
    weekend_lift = 0.0
    if weekday_mean and weekday_mean > 0:
        weekend_lift = round(((weekend_mean - weekday_mean) / weekday_mean) * 100, 2)

    # Multi-year YoY comparison matrix (Month vs Year demand)
    yoy_df = df.groupby(["year", "month"])["quantity"].mean().reset_index()
    yoy_matrix = []
    for month_num in range(1, 13):
        m_row = {"month": month_num}
        for yr in sorted(df["year"].unique()):
            match = yoy_df[(yoy_df["year"] == yr) & (yoy_df["month"] == month_num)]
            m_row[str(yr)] = round(float(match["quantity"].iloc[0]), 2) if not match.empty else None
        yoy_matrix.append(m_row)

    return {
        "by_month": {str(k): v for k, v in by_month.items()},
        "by_day_of_week": by_day_of_week,
        "by_season": by_season,
        "seasonal_index": seasonal_index,
        "holiday_avg_demand": holiday_vs_normal.get(True, holiday_vs_normal.get(1, 0.0)),
        "normal_avg_demand": holiday_vs_normal.get(False, holiday_vs_normal.get(0, 0.0)),
        "weekend_lift_pct": weekend_lift,
        "yoy_monthly_matrix": yoy_matrix,
        "data_sufficiency": {
            "status": sufficiency_status,
            "annual_cycles": annual_cycles,
            "warning": warning_msg,
        },
    }


def get_diagnostic_analytics(
    db: Session,
    category: str = None,
    start_date: str = None,
    end_date: str = None,
) -> dict:
    """
    Diagnostic analytics (Section 5):
    - Promotion vs non-promotion comparison with explicit causal disclaimer
    - Holiday vs non-holiday comparison with causal disclaimer
    - Statistical demand anomaly detection (|z| >= 1.75)
    - Period-over-period observations
    """
    df = get_sales_dataframe(db, category=category, start_date=start_date, end_date=end_date)

    if df.empty:
        return {
            "promotion_comparison": {},
            "holiday_comparison": {},
            "anomalies": [],
            "causal_disclaimer": "Observational only; no causal claims.",
        }

    # 1. Promotion comparison
    promo_rows = df[df["promotion_flag"] == 1]
    non_promo_rows = df[df["promotion_flag"] == 0]

    promo_avg_qty = float(promo_rows["quantity"].mean()) if not promo_rows.empty else 0.0
    non_promo_avg_qty = float(non_promo_rows["quantity"].mean()) if not non_promo_rows.empty else 0.0
    promo_lift_pct = (
        round(((promo_avg_qty - non_promo_avg_qty) / non_promo_avg_qty) * 100, 2)
        if non_promo_avg_qty > 0 else 0.0
    )

    promo_comp = {
        "promotional_transactions": len(promo_rows),
        "non_promotional_transactions": len(non_promo_rows),
        "promo_avg_quantity": round(promo_avg_qty, 2),
        "non_promo_avg_quantity": round(non_promo_avg_qty, 2),
        "observed_lift_pct": promo_lift_pct,
        "avg_discount_pct": round(float(promo_rows["discount"].mean() * 100), 1) if not promo_rows.empty else 0.0,
        "causal_disclaimer": (
            "NOTICE: This metric represents observed correlation between promotional flags and unit sales. "
            "It does not constitute causal attribution without formal experimental or counterfactual control."
        ),
    }

    # 2. Holiday comparison
    holiday_rows = df[df["holiday_flag"] == 1]
    normal_rows = df[df["holiday_flag"] == 0]

    holiday_avg_qty = float(holiday_rows["quantity"].mean()) if not holiday_rows.empty else 0.0
    normal_avg_qty = float(normal_rows["quantity"].mean()) if not normal_rows.empty else 0.0
    holiday_lift_pct = (
        round(((holiday_avg_qty - normal_avg_qty) / normal_avg_qty) * 100, 2)
        if normal_avg_qty > 0 else 0.0
    )

    holiday_comp = {
        "holiday_transactions": len(holiday_rows),
        "normal_transactions": len(normal_rows),
        "holiday_avg_quantity": round(holiday_avg_qty, 2),
        "normal_avg_quantity": round(normal_avg_qty, 2),
        "observed_lift_pct": holiday_lift_pct,
        "causal_disclaimer": (
            "NOTICE: Observed holiday sales surge reflects calendar association, not standalone causal impact."
        ),
    }

    # 3. Demand anomaly detection (Z-score on monthly demand)
    monthly_agg = df.groupby("year_month").agg(
        quantity=("quantity", "sum"),
        revenue=("revenue", "sum"),
    ).reset_index()

    mean_qty = monthly_agg["quantity"].mean()
    std_qty = monthly_agg["quantity"].std()

    anomalies = []
    if std_qty and std_qty > 0:
        monthly_agg["z_score"] = (monthly_agg["quantity"] - mean_qty) / std_qty
        anomaly_rows = monthly_agg[monthly_agg["z_score"].abs() >= 1.75]
        for _, r in anomaly_rows.iterrows():
            z = round(float(r["z_score"]), 2)
            direction = "Demand Surge (Positive Anomaly)" if z > 0 else "Demand Drop (Negative Anomaly)"
            anomalies.append({
                "period": str(r["year_month"]),
                "quantity": int(r["quantity"]),
                "expected_mean": round(float(mean_qty), 1),
                "z_score": z,
                "direction": direction,
                "explanation": (
                    f"Observed demand of {int(r['quantity'])} units deviated by {abs(z):.1f} standard deviations "
                    f"from the monthly average of {mean_qty:.1f} units."
                ),
            })

    return {
        "promotion_comparison": promo_comp,
        "holiday_comparison": holiday_comp,
        "anomalies": anomalies,
    }


def get_product_inventory_status(db: Session, category: str = None) -> list:
    """Return latest inventory status snapshot for every product."""
    query = db.query(SalesRecord)
    if isinstance(category, str) and category.strip() and category.lower() != "all":
        query = query.filter(SalesRecord.product_category.ilike(category.strip()))

    records = query.all()
    if not records:
        return []

    data = [{
        "sku_id": r.sku_id,
        "product_name": r.product_name,
        "product_category": r.product_category,
        "order_date": r.order_date,
        "current_inventory": r.current_inventory,
        "safety_stock": r.safety_stock,
        "reorder_point": r.reorder_point,
        "lead_time_days": r.lead_time_days,
        "stockout_risk": bool(r.stockout_risk),
        "overstock_risk": bool(r.overstock_risk),
        "inventory_status": r.inventory_status,
        "recommended_reorder_qty": r.recommended_reorder_qty,
        "unit_price": r.unit_price,
    } for r in records]

    df = pd.DataFrame(data)
    df["order_date"] = pd.to_datetime(df["order_date"])

    latest_indices = df.groupby("product_name")["order_date"].idxmax()
    latest_df = df.loc[latest_indices].sort_values(
        ["stockout_risk", "product_category", "product_name"],
        ascending=[False, True, True]
    )

    return [
        {
            "sku_id": str(row["sku_id"]),
            "product_name": str(row["product_name"]),
            "product_category": str(row["product_category"]),
            "current_inventory": int(row["current_inventory"]),
            "safety_stock": int(row["safety_stock"]),
            "reorder_point": int(row["reorder_point"]),
            "lead_time_days": int(row["lead_time_days"]),
            "stockout_risk": bool(row["stockout_risk"]),
            "overstock_risk": bool(row["overstock_risk"]),
            "inventory_status": str(row["inventory_status"]),
            "recommended_reorder_qty": int(row["recommended_reorder_qty"]),
            "unit_price": round(float(row["unit_price"]), 2),
            "last_order_date": str(row["order_date"].date()),
        }
        for _, row in latest_df.iterrows()
    ]