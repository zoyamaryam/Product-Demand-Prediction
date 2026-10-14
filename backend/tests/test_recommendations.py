import unittest
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import SessionLocal
from app.recommendations import (
    get_latest_inventory_snapshot,
    generate_recommendations,
)


class TestRecommendations(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_get_latest_inventory_snapshot(self):
        snapshot = get_latest_inventory_snapshot(self.db)
        self.assertFalse(snapshot.empty)
        self.assertEqual(len(snapshot), 4)
        expected_cols = {"product_category", "avg_inventory", "avg_safety_stock", "avg_reorder_point"}
        self.assertTrue(expected_cols.issubset(set(snapshot.columns)))

    def test_generate_recommendations(self):
        recs = generate_recommendations(self.db)
        self.assertEqual(len(recs), 4)
        for r in recs:
            self.assertIn("category", r)
            self.assertIn("predicted_demand", r)
            self.assertIn("avg_current_inventory", r)
            self.assertIn("stockout_risk", r)
            self.assertIn("overstock_risk", r)
            self.assertIn("stockout_severity", r)
            self.assertIn("reasons", r)
            self.assertIsInstance(r["reasons"], list)
            self.assertGreater(len(r["reasons"]), 0)


if __name__ == "__main__":
    unittest.main()
