import unittest
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import SessionLocal
from app.ml import (
    build_monthly_category_data,
    _add_features,
    predict_next_month,
    predict_all_categories,
    get_all_model_metrics,
)


class _DummyNoPredict:
    pass


class _DummyPredictor:
    def predict(self, X):
        return [100.0]


class TestML(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_build_monthly_category_data(self):
        monthly = build_monthly_category_data(self.db)
        self.assertFalse(monthly.empty)
        expected_cols = {"product_category", "year_month", "total_quantity", "avg_price"}
        self.assertTrue(expected_cols.issubset(set(monthly.columns)))

    def test_add_features(self):
        monthly = build_monthly_category_data(self.db)
        cat_df = monthly[monthly["product_category"] == "Electronics"].copy()
        feat_df = _add_features(cat_df)
        self.assertFalse(feat_df.empty)
        self.assertIn("lag1", feat_df.columns)
        self.assertIn("lag2", feat_df.columns)
        self.assertIn("rolling3", feat_df.columns)
        self.assertIn("month_num", feat_df.columns)

    def test_predict_next_month(self):
        pred = predict_next_month(self.db, "Electronics")
        self.assertEqual(pred["category"], "Electronics")
        self.assertIn("predicted_demand", pred)
        self.assertGreater(pred["predicted_demand"], 0)
        self.assertIn("confidence_range", pred)
        self.assertIn("lower", pred["confidence_range"])
        self.assertIn("upper", pred["confidence_range"])
        self.assertLessEqual(pred["confidence_range"]["lower"], pred["predicted_demand"])
        self.assertGreaterEqual(pred["confidence_range"]["upper"], pred["predicted_demand"])

    def test_predict_all_categories(self):
        all_preds = predict_all_categories(self.db)
        self.assertEqual(len(all_preds), 4)
        categories = {p["category"] for p in all_preds}
        self.assertEqual(categories, {"Beauty", "Clothing", "Electronics", "Home"})

    def test_get_all_model_metrics(self):
        metrics = get_all_model_metrics(self.db)
        self.assertEqual(len(metrics), 4)
        for m in metrics:
            self.assertIn("category", m)
            self.assertIn("mae", m)
            self.assertIn("rmse", m)
            self.assertIn("mape_pct", m)
            self.assertIn("validation_chart", m)
            self.assertGreater(len(m["validation_chart"]), 0)


    def test_predict_custom_all_categories(self):
        from app.ml import predict_custom
        for cat in ["Beauty", "Clothing", "Electronics", "Home"]:
            res = predict_custom(
                db=self.db,
                category=cat,
                month_num=6,
                avg_price=50.0,
                promo_days=5,
                holiday_days=1,
                lag1=80.0,
                lag2=75.0,
                rolling3=77.5,
                current_inventory=100,
            )
            self.assertEqual(res["category"], cat)
            self.assertGreaterEqual(res["predicted_demand"], 0)
            self.assertIn("confidence_range", res)
            self.assertLessEqual(res["confidence_range"]["lower"], res["predicted_demand"])
            self.assertGreaterEqual(res["confidence_range"]["upper"], res["predicted_demand"])
            self.assertIsNotNone(res["inventory_analysis"])

    def test_inventory_boundary_conditions(self):
        from app.ml import predict_custom
        # 1. Zero inventory with demand -> Critical Stockout Risk
        res_zero_inv = predict_custom(
            db=self.db, category="Electronics", month_num=10, avg_price=100.0,
            promo_days=0, holiday_days=0, lag1=50.0, lag2=50.0, current_inventory=0
        )
        inv = res_zero_inv["inventory_analysis"]
        d = res_zero_inv["predicted_demand"]
        self.assertEqual(inv["status"], "Critical Stockout Risk")
        self.assertEqual(inv["shortage_qty"], d)
        import math
        self.assertEqual(inv["recommended_reorder"], math.ceil(1.20 * d))

        # 2. Stock covering predicted demand -> Low Safety Buffer
        res_eq_dem = predict_custom(
            db=self.db, category="Electronics", month_num=10, avg_price=100.0,
            promo_days=0, holiday_days=0, lag1=50.0, lag2=50.0, current_inventory=int(math.ceil(d))
        )
        inv_eq = res_eq_dem["inventory_analysis"]
        self.assertEqual(inv_eq["status"], "Low Safety Buffer (Reorder Recommended)")
        self.assertEqual(inv_eq["shortage_qty"], 0.0)
        self.assertGreaterEqual(inv_eq["recommended_reorder"], 0)

        # 3. Stock exactly equal to target inventory (1.2 * d) -> Optimal Inventory
        target_inv = int(round(d * 1.20))
        res_eq_target = predict_custom(
            db=self.db, category="Electronics", month_num=10, avg_price=100.0,
            promo_days=0, holiday_days=0, lag1=50.0, lag2=50.0, current_inventory=target_inv
        )
        inv_target = res_eq_target["inventory_analysis"]
        self.assertEqual(inv_target["status"], "Optimal Inventory")
        self.assertEqual(inv_target["recommended_reorder"], 0)

        # 4. Stock more than twice predicted demand -> Overstock Warning
        overstock_inv = int(d * 2.5) + 10
        res_over = predict_custom(
            db=self.db, category="Electronics", month_num=10, avg_price=100.0,
            promo_days=0, holiday_days=0, lag1=50.0, lag2=50.0, current_inventory=overstock_inv
        )
        self.assertEqual(res_over["inventory_analysis"]["status"], "Overstock Warning")
        self.assertEqual(res_over["inventory_analysis"]["recommended_reorder"], 0)

    def test_unsupported_category_handling(self):
        from app.ml import predict_custom
        with self.assertRaises(ValueError):
            predict_custom(
                db=self.db, category="AutomotiveNonExistent", month_num=5,
                avg_price=50.0, promo_days=0, holiday_days=0, lag1=10.0, lag2=10.0
            )

    def test_calculate_metrics_correctness(self):
        import numpy as np
        from app.ml import calculate_metrics

        # Standard known test
        y_true = np.array([100.0, 200.0, 300.0])
        y_pred = np.array([110.0, 190.0, 330.0])
        res = calculate_metrics(y_true, y_pred)
        self.assertEqual(res["mae"], 16.67)
        self.assertEqual(res["rmse"], 19.15)
        self.assertAlmostEqual(res["mape_pct"], 8.33, places=1)
        # Total error = 10 + 10 + 30 = 50. Total actual = 600. WAPE = 50 / 600 * 100 = 8.33%
        self.assertEqual(res["wape_pct"], 8.33)

        # Zero actuals handling in MAPE & WAPE
        y_zero = np.array([0.0, 100.0])
        y_pred_zero = np.array([10.0, 110.0])
        res_zero = calculate_metrics(y_zero, y_pred_zero)
        # Should not throw divide-by-zero or return inf/nan
        self.assertTrue(np.isfinite(res_zero["mape_pct"]))
        self.assertTrue(np.isfinite(res_zero["wape_pct"]))
        # Total actual = 100. Total error = 10 + 10 = 20. WAPE = 20 / 100 * 100 = 20.0%
        self.assertEqual(res_zero["wape_pct"], 20.0)

    def test_feature_leakage_prevention(self):
        import pandas as pd
        from app.ml import _add_features

        # Synthesize a clean 10-period sequence
        data = {
            "year_month": pd.date_range("2022-01-01", periods=10, freq="MS").to_period("M"),
            "total_quantity": [100, 120, 110, 130, 150, 140, 160, 170, 180, 200],
        }
        df_base = pd.DataFrame(data)
        feat_base = _add_features(df_base)

        # Perturb only row 6 (index 5) total_quantity
        df_perturbed = df_base.copy()
        df_perturbed.loc[5, "total_quantity"] = 9999

        feat_perturbed = _add_features(df_perturbed)

        # Row 5 (target period 6) features MUST NOT be affected by row 5's own total_quantity!
        # Because lag1 uses row 4 (150), lag2 uses row 3 (130), and rolling3 uses rows 2,3,4 (110,130,150)
        row5_base = feat_base.iloc[2]  # after dropping first 2-3 rows
        row5_pert = feat_perturbed.iloc[2]
        self.assertEqual(row5_base["lag1"], row5_pert["lag1"])
        self.assertEqual(row5_base["lag2"], row5_pert["lag2"])
        self.assertEqual(row5_base["rolling3"], row5_pert["rolling3"])

    def test_baseline_evaluations_and_benchmarks(self):
        from app.ml import get_model_benchmark, FEATURE_SCHEMA
        benchmark = get_model_benchmark(self.db)

        self.assertIn("scorecard", benchmark)
        self.assertIn("aggregate_metrics", benchmark)
        self.assertIn("findings", benchmark)
        self.assertIn("categories", benchmark)
        self.assertEqual(len(benchmark["categories"]), 4)

        for cat_b in benchmark["categories"]:
            self.assertIn("models", cat_b)
            self.assertIn("xgboost", cat_b["models"])
            self.assertIn("naive", cat_b["models"])
            self.assertIn("seasonal_naive", cat_b["models"])
            self.assertIn("moving_average_3", cat_b["models"])
            self.assertIn("preferred_model", cat_b)
            self.assertIn("best_baseline", cat_b)
            self.assertIn("wape_improvement_pct", cat_b)
            self.assertIn("decision_summary", cat_b)

        # Verify feature schema has all required metadata
        self.assertEqual(FEATURE_SCHEMA["version"], "2.0.0")
        self.assertEqual(len(FEATURE_SCHEMA["features"]), 7)
        self.assertTrue(FEATURE_SCHEMA["leakage_prevention_audit"]["target_period_excluded"])

    def test_saved_model_artifact_integrity(self):
        import pickle
        from app.ml import MODEL_DIR, MODEL_VERSION
        for cat in ["Beauty", "Clothing", "Electronics", "Home"]:
            model_file = MODEL_DIR / f"model_{cat}.pkl"
            self.assertTrue(model_file.exists(), f"Model artifact {model_file} does not exist")
            with open(model_file, "rb") as f:
                artifact = pickle.load(f)
            self.assertIn("model", artifact)
            self.assertIn("residual_std", artifact)
            self.assertIn("metrics", artifact)
            self.assertIn("feature_schema", artifact)
            self.assertEqual(artifact.get("model_version"), MODEL_VERSION)

            m = artifact["metrics"]
            self.assertIn("baselines", m)
            self.assertIn("wape_pct", m)
            self.assertIn("empirical_coverage_pct", m)

    # ---------------- Phase 4 Model Registry & Inference Tests ---------------- #

    def test_model_registry_cached_loading_no_retraining(self):
        """Verify models are loaded from cache on repeated requests without disk/training overhead."""
        from app.ml import model_registry
        model_registry.clear_cache()

        # First load
        art1 = model_registry.load_model("Electronics")
        self.assertIn("Electronics", model_registry._cache)

        # Second load must return identical cached instance
        art2 = model_registry.load_model("Electronics")
        self.assertIs(art1, art2)

    def test_model_registry_missing_artifact_raises(self):
        """Verify ModelNotFoundError when an artifact is missing."""
        import tempfile
        from app.ml import ModelRegistry, ModelNotFoundError

        with tempfile.TemporaryDirectory() as tmpdir:
            empty_registry = ModelRegistry(model_dir=Path(tmpdir))
            with self.assertRaises(ModelNotFoundError) as ctx:
                empty_registry.load_model("Beauty")
            self.assertIn("not available on disk", str(ctx.exception).lower())

    def test_model_registry_corrupted_artifacts(self):
        """Verify ModelCorruptedError when artifact fails structural or schema validation."""
        import tempfile
        import pickle
        from app.ml import ModelRegistry, ModelCorruptedError, FEATURES, MODEL_VERSION

        with tempfile.TemporaryDirectory() as tmpdir:
            corrupted_registry = ModelRegistry(model_dir=Path(tmpdir))

            # Case 1: Artifact is not a dict
            f1 = Path(tmpdir) / "model_Beauty.pkl"
            with open(f1, "wb") as f:
                pickle.dump(["not", "a", "dict"], f)
            with self.assertRaises(ModelCorruptedError):
                corrupted_registry.load_model("Beauty")
            f1.unlink()

            # Case 2: Artifact missing predict method
            f2 = Path(tmpdir) / "model_Beauty.pkl"
            with open(f2, "wb") as f:
                pickle.dump({"model": _DummyNoPredict()}, f)
            with self.assertRaises(ModelCorruptedError):
                corrupted_registry.load_model("Beauty")
            f2.unlink()

            # Case 3: Feature schema or feature order mismatch
            f3 = Path(tmpdir) / "model_Beauty.pkl"
            with open(f3, "wb") as f:
                pickle.dump({
                    "model": _DummyPredictor(),
                    "features": ["wrong_feature_order", "promo_days"],
                    "model_version": MODEL_VERSION,
                    "residual_std": 10.0
                }, f)
            with self.assertRaises(ModelCorruptedError) as ctx:
                corrupted_registry.load_model("Beauty")
            self.assertIn("schema", str(ctx.exception).lower())
            f3.unlink()

            # Case 4: Non-finite or negative residual_std
            f4 = Path(tmpdir) / "model_Beauty.pkl"
            with open(f4, "wb") as f:
                pickle.dump({
                    "model": _DummyPredictor(),
                    "features": FEATURES,
                    "model_version": MODEL_VERSION,
                    "residual_std": -5.0
                }, f)
            with self.assertRaises(ModelCorruptedError):
                corrupted_registry.load_model("Beauty")

    def test_agreement_between_api_predictions_and_direct_inference(self):
        """Verify API prediction strictly agrees with direct model inference on identical feature vector."""
        import numpy as np
        import pandas as pd
        from app.ml import model_registry, predict_next_month, FEATURES, SUPPORTED_CATEGORIES

        for cat in SUPPORTED_CATEGORIES:
            api_pred = predict_next_month(self.db, cat)
            artifact = model_registry.load_model(cat)
            model = artifact["model"]

            # Construct the feature vector from api_pred features_used
            features_dict = api_pred["features_used"]
            X = pd.DataFrame([features_dict])[FEATURES]
            direct_pred = max(0.0, round(float(model.predict(X)[0]), 2))

            # Predicted demand in api_pred must exactly match direct inference
            self.assertAlmostEqual(api_pred["predicted_demand"], direct_pred, places=2)

    def test_predict_batch_isolated_failures(self):
        """Verify predict_batch handles mixed inputs with item-level isolation."""
        from app.ml import predict_batch

        items = [
            {
                "request_id": "req-1",
                "category": "Home",
                "month_num": 6,
                "avg_price": 40.0,
                "promo_days": 2,
                "holiday_days": 0,
                "lag1": 100.0,
                "lag2": 95.0,
                "rolling3": 98.0,
                "current_inventory": 110,
            },
            {
                "request_id": "req-2-bad",
                "category": "InvalidCategoryX",
                "month_num": 6,
                "avg_price": 50.0,
                "promo_days": 0,
                "holiday_days": 0,
                "lag1": 50.0,
                "lag2": 50.0,
            },
            {
                "request_id": "req-3",
                "category": "Clothing",
                "month_num": 6,
                "avg_price": 50.0,
                "promo_days": 1,
                "holiday_days": 0,
                "lag1": 80.0,
                "lag2": 75.0,
                "rolling3": 78.0,
                "current_inventory": 85,
            }
        ]

        batch_res = predict_batch(self.db, items)
        self.assertEqual(batch_res["total_items"], 3)
        self.assertEqual(batch_res["successful_items"], 2)
        self.assertEqual(batch_res["failed_items"], 1)

        # Assert req-1 succeeded
        self.assertTrue(batch_res["results"][0]["success"])
        self.assertEqual(batch_res["results"][0]["request_id"], "req-1")

        # Assert req-2-bad failed gracefully
        self.assertFalse(batch_res["results"][1]["success"])
        self.assertEqual(batch_res["results"][1]["request_id"], "req-2-bad")
        self.assertIn("category", batch_res["results"][1]["error"].lower())

        # Assert req-3 succeeded
        self.assertTrue(batch_res["results"][2]["success"])
        self.assertEqual(batch_res["results"][2]["request_id"], "req-3")

    def test_repeated_requests_performance(self):
        """Verify repeated inference requests execute in sub-millisecond range using in-memory model cache."""
        import time
        from app.ml import predict_custom

        start_time = time.time()
        for _ in range(50):
            predict_custom(
                db=self.db,
                category="Beauty",
                month_num=8,
                avg_price=30.0,
                promo_days=2,
                holiday_days=0,
                lag1=80.0,
                lag2=75.0,
                rolling3=78.0,
            )
        elapsed = time.time() - start_time
        # 50 in-memory predictions should easily execute within 1.0 second
        self.assertLess(elapsed, 1.0, f"50 predictions took {elapsed:.2f}s, exceeding expected cached latency.")


if __name__ == "__main__":
    unittest.main()


