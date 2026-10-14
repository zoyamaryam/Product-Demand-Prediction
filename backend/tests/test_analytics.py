import unittest
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import SessionLocal
from app.analytics import (
    get_sales_dataframe,
    get_executive_summary,
    get_trending_products,
    get_category_trends,
    get_seasonality,
    get_diagnostic_analytics,
    get_product_inventory_status,
)


class TestAnalytics(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_get_sales_dataframe(self):
        df = get_sales_dataframe(self.db)
        self.assertFalse(df.empty)
        expected_cols = {"order_date", "product_name", "product_category", "quantity", "revenue", "year_month"}
        self.assertTrue(expected_cols.issubset(set(df.columns)))
        self.assertGreater(len(df), 1000)

    def test_get_executive_summary(self):
        summary = get_executive_summary(self.db)
        self.assertIn("total_revenue", summary)
        self.assertIn("total_quantity_sold", summary)
        self.assertIn("monthly_trend", summary)
        self.assertIn("category_distribution", summary)

        self.assertGreater(summary["total_revenue"], 0)
        self.assertGreater(summary["total_quantity_sold"], 0)
        self.assertEqual(summary["products_analyzed"], 20)
        self.assertIsInstance(summary["monthly_trend"], list)
        self.assertIsInstance(summary["category_distribution"], list)
        self.assertEqual(len(summary["category_distribution"]), 4)

        # Phase 2 Descriptive Analytics additions
        self.assertIn("avg_selling_price", summary)
        self.assertGreater(summary["avg_selling_price"], 0)
        self.assertIn("yoy_revenue_growth_pct", summary)
        self.assertIn("best_performing_products", summary)
        self.assertIn("worst_performing_products", summary)
        self.assertLessEqual(len(summary["best_performing_products"]), 5)
        self.assertLessEqual(len(summary["worst_performing_products"]), 5)
        self.assertGreater(len(summary["best_performing_products"]), 0)

        best_first = summary["best_performing_products"][0]
        self.assertIn("product_name", best_first)
        self.assertIn("revenue", best_first)
        self.assertIn("avg_price", best_first)

    def test_get_trending_products(self):
        trending = get_trending_products(self.db, top_n=5)
        self.assertIn("latest_month", trending)
        self.assertIn("prior_month", trending)
        self.assertIn("trending_up", trending)
        self.assertIn("trending_down", trending)
        self.assertLessEqual(len(trending["trending_up"]), 5)
        self.assertLessEqual(len(trending["trending_down"]), 5)

        # Phase 2 Momentum & Ranking additions
        self.assertIn("ranked_products", trending)
        self.assertEqual(len(trending["ranked_products"]), 20)
        first_ranked = trending["ranked_products"][0]
        self.assertIn("trend_direction", first_ranked)
        self.assertIn(first_ranked["trend_direction"], ["accelerating", "stable", "decelerating"])
        self.assertIn("growth_pct", first_ranked)
        self.assertIn("absolute_change", first_ranked)

    def test_get_category_trends(self):
        cat_trends = get_category_trends(self.db)
        self.assertEqual(len(cat_trends), 4)
        for cat in cat_trends:
            self.assertIn("category", cat)
            self.assertIn("total_quantity", cat)
            self.assertIn("yoy_growth_pct", cat)
            # Phase 2 additions
            self.assertIn("total_revenue", cat)
            self.assertIn("avg_unit_price", cat)
            self.assertGreater(cat["total_revenue"], 0)

    def test_get_seasonality(self):
        seasonality = get_seasonality(self.db)
        self.assertIn("by_month", seasonality)
        self.assertIn("by_day_of_week", seasonality)
        self.assertIn("by_season", seasonality)
        self.assertIn("holiday_avg_demand", seasonality)
        self.assertIn("normal_avg_demand", seasonality)

        # Phase 2 Seasonality additions
        self.assertIn("seasonal_index", seasonality)
        self.assertIn("weekend_lift_pct", seasonality)
        self.assertIn("yoy_monthly_matrix", seasonality)
        self.assertIn("data_sufficiency", seasonality)
        self.assertEqual(len(seasonality["yoy_monthly_matrix"]), 12)
        self.assertEqual(seasonality["data_sufficiency"]["status"], "sufficient")
        self.assertGreaterEqual(seasonality["data_sufficiency"]["annual_cycles"], 2.0)

        # Test category-filtered seasonality
        cat_seasonality = get_seasonality(self.db, category="Clothing")
        self.assertIn("by_season", cat_seasonality)
        self.assertGreater(len(cat_seasonality["by_season"]), 0)

    def test_get_diagnostic_analytics(self):
        diag = get_diagnostic_analytics(self.db)
        self.assertIn("promotion_comparison", diag)
        self.assertIn("holiday_comparison", diag)
        self.assertIn("anomalies", diag)

        # Test promotion comparison and causal disclaimer
        promo = diag["promotion_comparison"]
        self.assertIn("promo_avg_quantity", promo)
        self.assertIn("non_promo_avg_quantity", promo)
        self.assertIn("observed_lift_pct", promo)
        self.assertIn("avg_discount_pct", promo)
        self.assertIn("causal_disclaimer", promo)
        self.assertIn("causal", promo["causal_disclaimer"].lower())

        # Test holiday comparison and causal disclaimer
        holiday = diag["holiday_comparison"]
        self.assertIn("holiday_avg_quantity", holiday)
        self.assertIn("normal_avg_quantity", holiday)
        self.assertIn("observed_lift_pct", holiday)
        self.assertIn("causal_disclaimer", holiday)

        # Test anomalies structure
        self.assertIsInstance(diag["anomalies"], list)
        for anomaly in diag["anomalies"]:
            self.assertIn("period", anomaly)
            self.assertIn("z_score", anomaly)
            self.assertIn("direction", anomaly)
            self.assertIn("explanation", anomaly)

    def test_get_product_inventory_status(self):
        products = get_product_inventory_status(self.db)
        self.assertEqual(len(products), 20)
        first_product = products[0]
        self.assertIn("sku_id", first_product)
        self.assertIn("product_name", first_product)
        self.assertIn("product_category", first_product)
        self.assertIn("current_inventory", first_product)
        self.assertIn("safety_stock", first_product)
        self.assertIn("reorder_point", first_product)
        self.assertIn("inventory_status", first_product)

    def test_analytics_filtering_capabilities(self):
        # 1. Category filter
        elec_summary = get_executive_summary(self.db, category="Electronics")
        self.assertEqual(elec_summary["products_analyzed"], 5)
        for cat_info in elec_summary["category_distribution"]:
            self.assertEqual(cat_info["category"], "Electronics")

        # 2. Date range filter (single year 2023)
        yr_summary = get_executive_summary(self.db, start_date="2023-01-01", end_date="2023-12-31")
        self.assertGreater(yr_summary["total_revenue"], 0)
        for trend_point in yr_summary["monthly_trend"]:
            self.assertTrue(trend_point["period"].startswith("2023"))

        # 3. Insufficient data warning when date filter is narrowed to < 24 months
        short_seas = get_seasonality(self.db, start_date="2024-01-01", end_date="2024-12-31")
        self.assertEqual(short_seas["data_sufficiency"]["status"], "insufficient")
        self.assertIsNotNone(short_seas["data_sufficiency"]["warning"])


if __name__ == "__main__":
    unittest.main()
