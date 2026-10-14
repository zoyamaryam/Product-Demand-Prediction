"""
Unit and integration tests for Phase 6: Inventory Intelligence, Replenishment Policy & Pricing Insights.
Validates:
- Stockout and surplus classification logic
- Lead-time demand approximation (D * L / 30)
- Replenishment calculation rules
- Confirmation that automated ordering is disabled
- Handling of untracked incoming inventory
- Empirical pricing and markdown review rules
- Disclaimers on absent wholesale margins and non-causal claims
- API endpoint contracts and category filtering
"""

import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.db import SessionLocal
from app.recommendations import (
    get_latest_inventory_snapshot,
    generate_recommendations,
    get_inventory_intelligence,
    get_pricing_insights,
)


class TestInventoryAndPricingInsights(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.client = TestClient(app)

    def tearDown(self):
        self.db.close()

    def test_replenishment_policy_and_lead_time_calculations(self):
        """Verify lead-time demand, net inventory, and replenishment quantities."""
        recs = generate_recommendations(self.db)
        self.assertEqual(len(recs), 4)

        for r in recs:
            # Check mandatory Phase 6 fields
            self.assertIn("avg_lead_time_days", r)
            self.assertIn("lead_time_demand", r)
            self.assertIn("confirmed_incoming_inventory", r)
            self.assertIn("incoming_inventory_tracked", r)
            self.assertIn("suggested_replenishment_qty", r)
            self.assertIn("surplus_units", r)
            self.assertIn("assumptions", r)

            # Untracked incoming inventory is safely 0
            self.assertEqual(r["confirmed_incoming_inventory"], 0)
            self.assertFalse(r["incoming_inventory_tracked"])

            # Lead-time demand proportional run-rate formula: D * (L / 30)
            expected_ltd = round(r["predicted_demand"] * (r["avg_lead_time_days"] / 30.0), 1)
            self.assertAlmostEqual(r["lead_time_demand"], expected_ltd, delta=0.5)

            # Non-negative reorder suggestions
            self.assertGreaterEqual(r["suggested_replenishment_qty"], 0)
            self.assertIsInstance(r["suggested_replenishment_qty"], int)

            # Historical prototype labeling preserved
            self.assertIn("2025-01", r["forecast_period"])
            self.assertEqual(r["based_on_period"], "2024-12")

    def test_stockout_and_overstock_classification(self):
        """Verify severity ratings and consistency of stockout vs overstock flags."""
        intel = get_inventory_intelligence(self.db)
        self.assertIn("summary", intel)
        self.assertIn("category_risks", intel)
        self.assertFalse(intel["automated_ordering_enabled"])
        self.assertIn("Advisory Decision Support Only", intel["disclaimer"])

        for item in intel["category_risks"]:
            self.assertIn(item["stockout_severity"], ["Critical", "High", "Medium", "Low"])
            self.assertIn(item["inventory_status"], ["Critical Stockout", "Reorder Required", "Overstock", "Healthy"])

            if item["stockout_severity"] in ["Critical", "High"]:
                self.assertTrue(item["stockout_risk"])

            if item["overstock_risk"]:
                self.assertGreaterEqual(item["surplus_units"], 0)
                self.assertEqual(item["inventory_status"], "Overstock")

    def test_inventory_intelligence_category_filter(self):
        """Verify filtering by specific category."""
        clothing_intel = get_inventory_intelligence(self.db, category="Clothing")
        self.assertEqual(len(clothing_intel["category_risks"]), 1)
        self.assertEqual(clothing_intel["category_risks"][0]["category"], "Clothing")

        beauty_intel = get_inventory_intelligence(self.db, category="Beauty")
        self.assertEqual(len(beauty_intel["category_risks"]), 1)
        self.assertEqual(beauty_intel["category_risks"][0]["category"], "Beauty")

    def test_pricing_insights_rules_and_limitations(self):
        """Verify pricing insights, empirical calculations, and explicit limitation disclaimers."""
        pricing = get_pricing_insights(self.db)
        self.assertIn("category_insights", pricing)
        self.assertIn("sku_markdown_candidates", pricing)
        self.assertIn("data_limitations", pricing)
        self.assertIn("causal_claim_disclaimer", pricing)

        # Limitation disclaimer must state no wholesale cost or causal claims
        disclaimer = pricing["causal_claim_disclaimer"]
        self.assertIn("strictly distinguishes correlation from causation", disclaimer)
        self.assertIn("no claim that reducing prices will increase profit", disclaimer)

        limitations = " ".join(pricing["data_limitations"])
        self.assertIn("Wholesale Procurement Cost", limitations)
        self.assertIn("Gross Margin Data: Absent", limitations)

        # Inspect category pricing observations
        self.assertEqual(len(pricing["category_insights"]), 4)
        for cat_item in pricing["category_insights"]:
            self.assertGreater(cat_item["avg_unit_price"], 0)
            self.assertGreaterEqual(cat_item["avg_discount_pct"], 0)
            self.assertIsInstance(cat_item["empirical_observations"], list)
            self.assertGreater(len(cat_item["empirical_observations"]), 0)
            self.assertIsInstance(cat_item["limitations"], list)

    def test_pricing_insights_category_filter(self):
        """Verify pricing insights filtering by category."""
        home_pricing = get_pricing_insights(self.db, category="Home")
        self.assertEqual(len(home_pricing["category_insights"]), 1)
        self.assertEqual(home_pricing["category_insights"][0]["category"], "Home")

    def test_api_inventory_intelligence_endpoint(self):
        """Test GET /api/inventory/intelligence via TestClient."""
        res = self.client.get("/api/inventory/intelligence")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("summary", data)
        self.assertIn("category_risks", data)
        self.assertEqual(len(data["category_risks"]), 4)
        self.assertFalse(data["automated_ordering_enabled"])

        # Filtered request
        res_filter = self.client.get("/api/inventory/intelligence?category=Electronics")
        self.assertEqual(res_filter.status_code, 200)
        data_filter = res_filter.json()
        self.assertEqual(len(data_filter["category_risks"]), 1)
        self.assertEqual(data_filter["category_risks"][0]["category"], "Electronics")

    def test_api_pricing_insights_endpoint(self):
        """Test GET /api/pricing/insights via TestClient."""
        res = self.client.get("/api/pricing/insights")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("category_insights", data)
        self.assertIn("sku_markdown_candidates", data)
        self.assertEqual(len(data["category_insights"]), 4)
        self.assertIn("causal_claim_disclaimer", data)

        # Filtered request
        res_filter = self.client.get("/api/pricing/insights?category=Beauty")
        self.assertEqual(res_filter.status_code, 200)
        data_filter = res_filter.json()
        self.assertEqual(len(data_filter["category_insights"]), 1)
        self.assertEqual(data_filter["category_insights"][0]["category"], "Beauty")


if __name__ == "__main__":
    unittest.main()
