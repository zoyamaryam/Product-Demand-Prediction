"""
DemandIQ 2.0 — Inventory Intelligence, Replenishment Policy & Pricing Insights
Implements Master Prompt Section 7 requirements:
- Documented, testable inventory replenishment policy
- Proportional lead-time demand approximation (D * L / 30) from single-month forecast
- Safety stock and reorder point calculations
- Stockout and surplus classification with explicit severity ratings
- Missing incoming orders and lead-time constraints clearly documented
- Pricing and markdown observations derived from empirical transactions
- Explicit limitations: no wholesale costs, no causal profit claims, advisory only
"""

import math
from typing import Optional
import pandas as pd
from sqlalchemy.orm import Session
from app.db import SalesRecord
from app.ml import predict_all_categories


def get_latest_inventory_snapshot(db: Session) -> pd.DataFrame:
    """Get the most recent inventory-related figures per category (averaged across recent records)."""
    records = db.query(SalesRecord).all()
    if not records:
        return pd.DataFrame()

    data = [{
        "product_category": r.product_category,
        "order_date": r.order_date,
        "current_inventory": r.current_inventory,
        "safety_stock": r.safety_stock,
        "reorder_point": r.reorder_point,
        "lead_time_days": r.lead_time_days if r.lead_time_days is not None else 14,
        "unit_price": r.unit_price,
        "discount": r.discount if r.discount is not None else 0.0,
        "promotion_flag": r.promotion_flag if r.promotion_flag is not None else False,
        "quantity": r.quantity,
    } for r in records]

    df = pd.DataFrame(data)
    df["order_date"] = pd.to_datetime(df["order_date"])

    # Use the most recent 90 days of records per category as the "current" snapshot
    cutoff = df["order_date"].max() - pd.Timedelta(days=90)
    recent = df[df["order_date"] >= cutoff]
    if recent.empty:
        recent = df

    snapshot = recent.groupby("product_category").agg(
        avg_inventory=("current_inventory", "mean"),
        avg_safety_stock=("safety_stock", "mean"),
        avg_reorder_point=("reorder_point", "mean"),
        avg_lead_time=("lead_time_days", "mean"),
        avg_price=("unit_price", "mean"),
        avg_discount=("discount", "mean"),
    ).reset_index()

    return snapshot


def generate_recommendations(db: Session) -> list:
    """
    Produce category-level inventory recommendations and stock risk flags.
    Enriched with documented replenishment and lead-time metrics while
    preserving 100% backwards compatibility with existing consumers.
    """
    predictions = predict_all_categories(db)
    snapshot = get_latest_inventory_snapshot(db)

    recommendations = []

    for pred in predictions:
        category = pred["category"]
        row = snapshot[snapshot["product_category"] == category]
        if row.empty:
            continue
        row = row.iloc[0]

        predicted_demand = float(pred["predicted_demand"])
        upper_bound = float(pred["confidence_range"]["upper"])
        lower_bound = float(pred["confidence_range"]["lower"])
        avg_inventory = float(row["avg_inventory"])
        safety_stock = float(row["avg_safety_stock"])
        reorder_point = float(row["avg_reorder_point"])
        lead_time_days = float(row["avg_lead_time"])

        # Documented inventory policy calculations:
        # Lead-time demand: proportional monthly run-rate (D * L / 30)
        lead_time_demand = round(predicted_demand * (lead_time_days / 30.0), 1)

        # Confirmed incoming inventory: untracked in historical records -> 0
        confirmed_incoming = 0
        incoming_tracked = False

        # Net inventory available before lead-time depletion
        net_available = round(avg_inventory + confirmed_incoming - lead_time_demand, 1)

        # Suggested replenishment calculation (Review only, non-automated):
        # Target stock = predicted 1-month demand + safety buffer
        if avg_inventory <= reorder_point or net_available < safety_stock:
            suggested_reorder = max(0, int(math.ceil(predicted_demand + safety_stock - avg_inventory - confirmed_incoming)))
        else:
            suggested_reorder = 0

        # Stockout risk evaluation:
        # Critical if inventory cannot even cover supplier lead-time demand or is 0
        if avg_inventory <= lead_time_demand or avg_inventory == 0:
            stockout_risk = True
            stockout_severity = "High"
            inventory_status = "Critical Stockout"
        elif avg_inventory <= reorder_point or upper_bound > avg_inventory:
            stockout_risk = True
            stockout_severity = "Medium" if predicted_demand > avg_inventory else "Low"
            inventory_status = "Reorder Required"
        else:
            stockout_risk = False
            stockout_severity = "Low"
            inventory_status = "Healthy"

        # Overstock risk evaluation:
        overstock_risk = avg_inventory > (upper_bound * 1.5) and avg_inventory > (reorder_point * 1.5)
        surplus_units = max(0, int(round(avg_inventory - (predicted_demand + safety_stock)))) if overstock_risk else 0
        if overstock_risk:
            inventory_status = "Overstock"

        # Pricing / markdown prompt: overstocked AND demand run-rate sluggish
        pricing_flag = overstock_risk and (predicted_demand < avg_inventory * 0.6)

        reasons = []
        if stockout_risk:
            reasons.append(
                f"Predicted demand ({predicted_demand:.0f}, upper interval {upper_bound:.0f}) "
                f"exceeds on-hand buffer (~{avg_inventory:.0f} units) with {lead_time_days:.0f}-day lead time."
            )
        if overstock_risk:
            reasons.append(
                f"Current inventory (~{avg_inventory:.0f} units) exceeds 1-month demand buffer "
                f"by ~{surplus_units} units, creating capital lockup."
            )
        if pricing_flag:
            reasons.append("Consider a pricing review or promotional clearance to accelerate slow-moving stock.")
        if not reasons:
            reasons.append("Inventory levels appear adequately aligned with 1-month forward demand.")

        assumptions = [
            f"Supplier lead time: {lead_time_days:.0f} days (proportional lead-time demand: ~{lead_time_demand:.0f} units).",
            "Confirmed incoming orders: Untracked in dataset (assumed 0 units).",
            "Single-month planning horizon: Lead-time demand approximated as (D * L / 30); multi-month forecasts not assumed.",
            "Safety stock buffer established from historical monthly demand variance.",
        ]

        recommendations.append({
            "category": category,
            "predicted_demand": round(predicted_demand, 1),
            "confidence_range": pred["confidence_range"],
            "avg_current_inventory": round(avg_inventory, 1),
            "avg_reorder_point": round(reorder_point, 1),
            "avg_safety_stock": round(safety_stock, 1),
            "avg_lead_time_days": round(lead_time_days, 1),
            "lead_time_demand": lead_time_demand,
            "confirmed_incoming_inventory": confirmed_incoming,
            "incoming_inventory_tracked": incoming_tracked,
            "net_inventory_available": net_available,
            "suggested_replenishment_qty": suggested_reorder,
            "stockout_risk": bool(stockout_risk),
            "stockout_severity": stockout_severity,
            "overstock_risk": bool(overstock_risk),
            "surplus_units": surplus_units,
            "inventory_status": inventory_status,
            "pricing_review_recommended": bool(pricing_flag),
            "reasons": reasons,
            "assumptions": assumptions,
            "forecast_period": "2025-01 (Historical Prototype)",
            "based_on_period": "2024-12",
        })

    return recommendations


def get_inventory_intelligence(db: Session, category: Optional[str] = None) -> dict:
    """
    Return comprehensive inventory risk intelligence and replenishment planning.
    Includes category summaries, lead-time assumptions, and advisory-only disclaimers.
    """
    recs = generate_recommendations(db)
    if category and category.lower() != "all":
        recs = [r for r in recs if r["category"].lower() == category.lower()]

    stockout_count = sum(1 for r in recs if r["stockout_risk"])
    overstock_count = sum(1 for r in recs if r["overstock_risk"])
    healthy_count = sum(1 for r in recs if r["inventory_status"] == "Healthy")
    total_reorder_units = sum(r["suggested_replenishment_qty"] for r in recs)

    category_risks = [
        {
            "category": r["category"],
            "forecast_demand": r["predicted_demand"],
            "forecast_period": r["forecast_period"],
            "confidence_lower": r["confidence_range"]["lower"],
            "confidence_upper": r["confidence_range"]["upper"],
            "current_inventory": r["avg_current_inventory"],
            "safety_stock": r["avg_safety_stock"],
            "reorder_point": r["avg_reorder_point"],
            "lead_time_days": r["avg_lead_time_days"],
            "lead_time_demand": r["lead_time_demand"],
            "confirmed_incoming_inventory": r["confirmed_incoming_inventory"],
            "incoming_inventory_tracked": r["incoming_inventory_tracked"],
            "net_inventory_available": r["net_inventory_available"],
            "suggested_replenishment_qty": r["suggested_replenishment_qty"],
            "stockout_risk": r["stockout_risk"],
            "stockout_severity": r["stockout_severity"],
            "overstock_risk": r["overstock_risk"],
            "surplus_units": r["surplus_units"],
            "inventory_status": r["inventory_status"],
            "assumptions": r["assumptions"],
            "strategic_explanation": " ".join(r["reasons"]),
        }
        for r in recs
    ]

    return {
        "summary": {
            "total_categories": len(recs),
            "stockout_risk_count": stockout_count,
            "overstock_risk_count": overstock_count,
            "healthy_count": healthy_count,
            "total_suggested_reorder_units": total_reorder_units,
            "active_dataset_cycle": "2024-12 (Historical Dataset)",
        },
        "category_risks": category_risks,
        "disclaimer": (
            "Advisory Decision Support Only: All replenishment quantities are recommendations for buyer review. "
            "DemandIQ never places automated purchasing orders. Quantities must be reconciled with vendor Minimum "
            "Order Quantities (MOQs), warehouse storage capacity, and working capital limits. "
            "Lead-time demand is approximated proportionally from the 1-month forecast (D * L / 30); "
            "confirmed incoming orders are not tracked in historical records and are assumed to be 0."
        ),
        "automated_ordering_enabled": False,
    }


def get_pricing_insights(db: Session, category: Optional[str] = None) -> dict:
    """
    Produce empirical pricing and promotional markdown insights across categories and SKUs.
    Strictly observes actual transaction correlations without inferring causal profit claims.
    """
    records = db.query(SalesRecord).all()
    if not records:
        return {
            "category_insights": [],
            "sku_markdown_candidates": [],
            "data_limitations": [
                "No transaction records available in the database to calculate pricing insights.",
            ],
            "causal_claim_disclaimer": "No causal profit claims are made.",
        }

    data = [{
        "sku_id": r.sku_id,
        "product_name": r.product_name,
        "product_category": r.product_category,
        "order_date": r.order_date,
        "quantity": r.quantity,
        "unit_price": r.unit_price,
        "discount": r.discount if r.discount is not None else 0.0,
        "promotion_flag": bool(r.promotion_flag),
        "current_inventory": r.current_inventory,
        "reorder_point": r.reorder_point,
        "inventory_status": r.inventory_status,
        "overstock_risk": bool(r.overstock_risk),
    } for r in records]

    df = pd.DataFrame(data)
    df["order_date"] = pd.to_datetime(df["order_date"])

    # Recent 180 days for stable pricing and promotional lift evaluation
    cutoff = df["order_date"].max() - pd.Timedelta(days=180)
    recent = df[df["order_date"] >= cutoff]
    if recent.empty:
        recent = df

    # Filter by category if requested
    target_categories = (
        [category] if category and category.lower() != "all"
        else sorted(recent["product_category"].unique())
    )

    category_insights = []

    for cat in target_categories:
        cat_df = recent[recent["product_category"] == cat]
        if cat_df.empty:
            continue

        avg_price = float(cat_df["unit_price"].mean())
        avg_discount = float(cat_df["discount"].mean() * 100.0)
        promo_rate = float(cat_df["promotion_flag"].mean() * 30.0)  # estimated promo days / month
        sales_volume = float(cat_df["quantity"].mean())

        # Promotional lift observation:
        promo_vol = cat_df[cat_df["promotion_flag"] == True]["quantity"].mean()
        non_promo_vol = cat_df[cat_df["promotion_flag"] == False]["quantity"].mean()

        if pd.notnull(promo_vol) and pd.notnull(non_promo_vol) and non_promo_vol > 0:
            promo_lift_pct = round(float(((promo_vol - non_promo_vol) / non_promo_vol) * 100.0), 1)
        else:
            promo_lift_pct = None

        # Check overstock condition in category
        overstock_flag = bool(cat_df["overstock_risk"].mean() > 0.25)

        # Rule-based pricing guidance:
        empirical_obs = [
            f"Average observed unit selling price: ${avg_price:.2f}.",
            f"Historical discount depth: {avg_discount:.1f}% across recorded orders.",
            f"Promotional activity: approximately {promo_rate:.1f} promotional days per month.",
        ]

        if promo_lift_pct is not None:
            if promo_lift_pct > 15.0:
                empirical_obs.append(
                    f"Observed volume lift: Orders during active promotions averaged +{promo_lift_pct}% higher unit volume."
                )
            elif promo_lift_pct < 5.0:
                empirical_obs.append(
                    f"Observed volume lift: Sales volume showed minimal sensitivity (+{promo_lift_pct}%) to recorded promotional flags."
                )
            else:
                empirical_obs.append(
                    f"Observed volume lift: Moderate empirical lift of +{promo_lift_pct}% associated with promotions."
                )

        if overstock_flag:
            pricing_review = True
            rec_action = "Evaluate Selective Markdown / Promotional Bundle"
            rationale = (
                f"Category exhibits elevated holding stock relative to velocity. "
                f"A temporary promotional markdown or bundle discount may help accelerate inventory turnover."
            )
        elif promo_lift_pct is not None and promo_lift_pct < 5.0:
            pricing_review = False
            rec_action = "Maintain Shelf Price Stability"
            rationale = (
                "Empirical sales volume is relatively invariant to discounting. "
                "Aggressive discounting risks sacrificing net realization without stimulating proportional unit demand."
            )
        else:
            pricing_review = False
            rec_action = "Regular Pricing Cadence"
            rationale = "Current price and promotional frequency align with normal demand velocity."

        category_insights.append({
            "category": cat,
            "avg_unit_price": round(avg_price, 2),
            "avg_discount_pct": round(avg_discount, 1),
            "promo_days_avg": round(promo_rate, 1),
            "observed_sales_volume": round(sales_volume, 1),
            "promo_volume_lift_pct": promo_lift_pct,
            "overstock_flag": overstock_flag,
            "pricing_review_recommended": pricing_review,
            "recommended_action": rec_action,
            "rationale": rationale,
            "empirical_observations": empirical_obs,
            "limitations": [
                "Wholesale unit costs and product margins are absent from dataset; margin protection must be verified before implementing discounts.",
                "Promotional lift reflects observational correlation and does not guarantee future price elasticity or profit gains.",
                "No causal claim is made that price changes will optimize total retail revenue.",
            ],
        })

    # SKU-level markdown candidate identification:
    latest_indices = df.groupby("product_name")["order_date"].idxmax()
    latest_skus = df.loc[latest_indices]

    sku_candidates = []
    for _, row in latest_skus.iterrows():
        is_overstock = bool(row["overstock_risk"]) or row["inventory_status"] == "Overstock"
        if category and category.lower() != "all" and row["product_category"].lower() != category.lower():
            continue

        if is_overstock:
            sku_candidates.append({
                "sku_id": str(row["sku_id"]),
                "product_name": str(row["product_name"]),
                "category": str(row["product_category"]),
                "unit_price": round(float(row["unit_price"]), 2),
                "current_inventory": int(row["current_inventory"]),
                "reorder_point": int(row["reorder_point"]),
                "inventory_status": str(row["inventory_status"]),
                "markdown_candidate": True,
                "observation_summary": (
                    f"Current stock ({row['current_inventory']} units) substantially exceeds reorder threshold "
                    f"({row['reorder_point']} units). Identified for markdown consideration to free storage capacity."
                ),
            })

    return {
        "category_insights": category_insights,
        "sku_markdown_candidates": sku_candidates,
        "data_limitations": [
            "Wholesale Procurement Cost: Not tracked in dataset. Profitability or cost-floor boundaries cannot be confirmed automatically.",
            "Gross Margin Data: Absent. Markdown recommendations address inventory turnover only, not margin maximization.",
            "Econometric Elasticity: Observations reflect historical promotional flag associations, not rigorous causal price elasticity.",
            "Price Optimization: DemandIQ does not claim any specific price point is 'optimal' or guaranteed to increase profits.",
        ],
        "causal_claim_disclaimer": (
            "Important Analytical Notice: Observed price and demand patterns are correlational associations from historical "
            "retail transaction records. DemandIQ strictly distinguishes correlation from causation and makes no claim that "
            "reducing prices will increase profit or that observed promotional lifts will repeat identically."
        ),
    }