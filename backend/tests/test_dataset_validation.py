"""
DemandIQ 2.0 — Phase 1 Dataset Validation Tests
Validates synthetic dataset properties against Master Prompt Section 3 requirements.
"""

import json
import unittest
import sys
from pathlib import Path
import pandas as pd

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import RAW_DATA_PATH
from app.db import SessionLocal, SalesRecord


class TestDatasetValidation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not RAW_DATA_PATH.exists():
            raise FileNotFoundError(f"Raw dataset missing at {RAW_DATA_PATH}")
        cls.df = pd.read_csv(RAW_DATA_PATH)
        cls.df["order_date_dt"] = pd.to_datetime(cls.df["order_date"])

    def test_synthetic_labelling_and_provenance(self):
        """Verify 100% of rows are explicitly labelled as synthetic (Section 3)."""
        self.assertIn("is_synthetic", self.df.columns)
        self.assertIn("data_source", self.df.columns)

        # Must be 100% synthetic
        self.assertTrue((self.df["is_synthetic"].astype(bool)).all(), "Every record must be labelled synthetic")

        # Verify metadata file exists
        meta_path = RAW_DATA_PATH.parent / "dataset_metadata.json"
        self.assertTrue(meta_path.exists(), "dataset_metadata.json must exist")
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
        self.assertTrue(meta.get("is_synthetic"))
        self.assertIn("disclaimer", meta)
        self.assertIn("synthetic", meta["disclaimer"].lower())

    def test_consecutive_months_requirement(self):
        """Verify dataset contains at least 36 consecutive months of data (Section 3)."""
        months_series = self.df["order_date_dt"].dt.to_period("M").sort_values().unique()
        n_months = len(months_series)
        self.assertGreaterEqual(n_months, 36, f"Dataset must have at least 36 consecutive months, found {n_months}")

        # Verify no gaps in the consecutive month sequence
        first_m = months_series[0]
        last_m = months_series[-1]
        expected_span = (last_m - first_m).n + 1
        self.assertEqual(n_months, expected_span, "Dataset contains gaps in the monthly time series")

    def test_missing_values_and_nulls(self):
        """Verify zero missing or NaN values across all required attributes."""
        null_counts = self.df.isnull().sum()
        cols_with_nulls = null_counts[null_counts > 0]
        self.assertEqual(len(cols_with_nulls), 0, f"Found unexpected null values in columns: {cols_with_nulls.to_dict()}")

    def test_non_negativity_and_domain_constraints(self):
        """Verify physical and financial values are non-negative."""
        self.assertTrue((self.df["quantity"] > 0).all(), "Quantity must be strictly positive")
        self.assertTrue((self.df["unit_price"] > 0).all(), "Unit price must be strictly positive")
        self.assertTrue((self.df["current_inventory"] >= 0).all(), "Inventory cannot be negative")
        self.assertTrue((self.df["lead_time_days"] > 0).all(), "Lead time must be strictly positive")
        self.assertTrue((self.df["revenue"] >= 0).all(), "Revenue cannot be negative")
        self.assertTrue((self.df["discount"] >= 0.0).all(), "Discount cannot be negative")
        self.assertTrue((self.df["discount"] < 1.0).all(), "Discount must be less than 100%")

    def test_mathematical_revenue_consistency(self):
        """Verify revenue equals quantity * net_unit_price within floating point tolerance."""
        expected_net_price = (self.df["unit_price"] * (1.0 - self.df["discount"])).round(2)
        price_diff = (self.df["net_unit_price"] - expected_net_price).abs()
        self.assertTrue((price_diff <= 0.02).all(), "net_unit_price mismatch with unit_price * (1 - discount)")

        expected_revenue = (self.df["quantity"] * self.df["net_unit_price"]).round(2)
        rev_diff = (self.df["revenue"] - expected_revenue).abs()
        self.assertTrue((rev_diff <= 0.05).all(), "Revenue mismatch with quantity * net_unit_price")

    def test_catalog_consistency_and_stable_skus(self):
        """Verify exactly 20 distinct products, 4 categories, and stable 1:1 SKU mapping."""
        self.assertEqual(self.df["product_name"].nunique(), 20, "Must contain exactly 20 distinct products")
        self.assertEqual(self.df["sku_id"].nunique(), 20, "Must contain exactly 20 distinct SKUs")

        categories = set(self.df["product_category"].unique())
        self.assertEqual(categories, {"Beauty", "Clothing", "Electronics", "Home"})

        # Verify 1:1 SKU to product name mapping
        sku_map = self.df.groupby("sku_id")["product_name"].nunique()
        self.assertTrue((sku_map == 1).all(), "Each SKU must map to exactly one product name")

    def test_inventory_policy_and_reorder_logic(self):
        """Verify reorder quantities are non-negative and 0 when inventory is healthy/overstocked."""
        self.assertTrue((self.df["recommended_reorder_qty"] >= 0).all(), "Reorder quantity cannot be negative")

        # When current inventory is strictly greater than reorder point, reorder quantity should be 0
        healthy_rows = self.df[self.df["current_inventory"] > self.df["reorder_point"]]
        self.assertTrue((healthy_rows["recommended_reorder_qty"] == 0).all(), "Reorder quantity should be 0 above reorder point")

    def test_database_persistence_and_synthetic_flag(self):
        """Verify records in SQLite database have is_synthetic=True."""
        db = SessionLocal()
        try:
            sample_records = db.query(SalesRecord).limit(10).all()
            self.assertGreater(len(sample_records), 0, "Database must contain loaded records")
            for r in sample_records:
                self.assertTrue(r.is_synthetic, "Database records must have is_synthetic=True")
                self.assertEqual(r.data_source, "DemandIQ_Synthetic_Retail_v2")
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
