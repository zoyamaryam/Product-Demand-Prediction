import unittest
import sys
from pathlib import Path
from unittest.mock import patch

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient

from app.db import SessionLocal
from app.main import app, system_status
from app.routers.trends import summary, trending_products, category_trends, seasonality, diagnostics
from app.routers.predictions import predict_all, get_metrics, predict, get_benchmark, get_feature_schema
from app.routers.recommendations import recommendations, product_inventory
from app.routers.ai import insights, ask, AskRequest
from app.ml import ModelNotFoundError, ModelCorruptedError, SUPPORTED_CATEGORIES


class TestAPIEndpoints(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.client = TestClient(app)

    def tearDown(self):
        self.db.close()

    def test_status_endpoint(self):
        res = system_status(self.db)
        self.assertEqual(res["status"], "ok")
        self.assertTrue(res["database"]["connected"])
        self.assertGreater(res["database"]["records"], 0)
        self.assertIn("categories", res["database"])
        self.assertIn("ml", res)
        self.assertIn("ai", res)

    def test_summary_endpoint(self):
        res = summary(self.db)
        self.assertIn("total_revenue", res)
        self.assertIn("monthly_trend", res)
        self.assertIn("avg_selling_price", res)
        self.assertIn("best_performing_products", res)


    def test_trends_endpoints(self):
        products_res = trending_products(self.db)
        self.assertIn("trending_up", products_res)
        self.assertIn("ranked_products", products_res)

        cat_res = category_trends(self.db)
        self.assertEqual(len(cat_res), 4)

        seas_res = seasonality(category="Electronics", db=self.db)
        self.assertIn("by_season", seas_res)
        self.assertIn("seasonal_index", seas_res)
        self.assertIn("data_sufficiency", seas_res)

        diag_res = diagnostics(category=None, db=self.db)
        self.assertIn("promotion_comparison", diag_res)
        self.assertIn("holiday_comparison", diag_res)
        self.assertIn("anomalies", diag_res)

    def test_prediction_endpoints(self):
        all_preds = predict_all(self.db)
        self.assertEqual(len(all_preds), 4)

        metrics = get_metrics(self.db)
        self.assertEqual(len(metrics), 4)
        for m in metrics:
            self.assertIn("wape_pct", m)
            self.assertIn("baselines", m)
            self.assertIn("preferred_model", m)

        bench = get_benchmark(self.db)
        self.assertIn("scorecard", bench)
        self.assertIn("aggregate_metrics", bench)
        self.assertIn("categories", bench)
        self.assertEqual(len(bench["categories"]), 4)

        schema = get_feature_schema()
        self.assertEqual(schema["version"], "2.0.0")
        self.assertIn("features", schema)
        self.assertEqual(len(schema["features"]), 7)

        single_pred = predict("Clothing", self.db)
        self.assertEqual(single_pred["category"], "Clothing")

        from app.routers.predictions import get_defaults, predict_custom_endpoint, CustomPredictionRequest
        defaults = get_defaults("Clothing", self.db)
        self.assertEqual(defaults["category"], "Clothing")
        self.assertIn("avg_price", defaults)
        self.assertIn("lag1", defaults)

        custom_req = CustomPredictionRequest(
            category="Clothing",
            month_num=9,
            avg_price=45.0,
            promo_days=5,
            holiday_days=1,
            lag1=120.0,
            lag2=110.0,
            rolling3=115.0,
            current_inventory=80,
        )
        custom_res = predict_custom_endpoint(custom_req, self.db)
        self.assertEqual(custom_res["category"], "Clothing")
        self.assertGreater(custom_res["predicted_demand"], 0)
        self.assertIn("confidence_range", custom_res)
        self.assertIsNotNone(custom_res["inventory_analysis"])
        self.assertIn("recommended_reorder", custom_res["inventory_analysis"])

        # Test validation: February (month 2) cannot have 30 promo days
        with self.assertRaises(Exception):
            CustomPredictionRequest(
                category="Clothing", month_num=2, avg_price=50.0, promo_days=30, holiday_days=0, lag1=50.0, lag2=50.0
            )

        # Test validation: infinite price is rejected
        with self.assertRaises(Exception):
            CustomPredictionRequest(
                category="Clothing", month_num=5, avg_price=float("inf"), promo_days=5, holiday_days=0, lag1=50.0, lag2=50.0
            )



    def test_recommendation_endpoints(self):
        recs = recommendations(self.db)
        self.assertEqual(len(recs), 4)

        prod_inv = product_inventory(self.db)
        self.assertEqual(len(prod_inv), 20)

    from unittest.mock import patch

    @patch("app.ai.call_ollama")
    def test_ai_endpoints(self, mock_ollama):
        mock_ollama.return_value = "Mocked AI business insight for testing purposes."
        insight_res = insights(self.db)
        self.assertIn("insight", insight_res)
        self.assertGreater(len(insight_res["insight"]), 20)

        mock_ollama.return_value = "Mocked response for question."
        ask_res = ask(AskRequest(question="Which category has highest stockout risk?"), self.db)
        self.assertIn("answer", ask_res)
        self.assertGreater(len(ask_res["answer"]), 10)

    # ---------------- Phase 4 HTTP Endpoint Tests ---------------- #

    def test_http_single_category_prediction_all_categories(self):
        """Test GET /api/predict/{category} for every supported category."""
        for cat in SUPPORTED_CATEGORIES:
            res = self.client.get(f"/api/predict/{cat}")
            self.assertEqual(res.status_code, 200, f"Failed for category {cat}: {res.text}")
            data = res.json()
            self.assertEqual(data["category"], cat)
            self.assertIn("forecast_period", data)
            self.assertIn("predicted_demand", data)
            self.assertGreater(data["predicted_demand"], 0)
            self.assertIn("confidence_range", data)
            self.assertLessEqual(data["confidence_range"]["lower"], data["predicted_demand"])
            self.assertGreaterEqual(data["confidence_range"]["upper"], data["predicted_demand"])
            self.assertIn("model_version", data)
            self.assertEqual(data["model_version"], "2.0.0")
            self.assertIn("preferred_model", data)
            self.assertIn("is_fallback", data)
            self.assertFalse(data["is_fallback"])

    def test_http_predict_all_categories(self):
        """Test GET /api/predict returns predictions for all 4 categories."""
        res = self.client.get("/api/predict")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(len(data), 4)
        returned_cats = {item["category"] for item in data}
        self.assertEqual(returned_cats, set(SUPPORTED_CATEGORIES))

    def test_http_invalid_category_returns_404(self):
        """Test GET /api/predict/{invalid_category} returns HTTP 404."""
        res = self.client.get("/api/predict/InvalidAutomotiveCategory")
        self.assertEqual(res.status_code, 404)
        self.assertIn("category", res.json()["detail"].lower())

        res_def = self.client.get("/api/predict/defaults/InvalidAutomotiveCategory")
        self.assertEqual(res_def.status_code, 404)

    def test_http_custom_prediction_success(self):
        """Test POST /api/predict/custom with valid payload."""
        payload = {
            "category": "Electronics",
            "month_num": 11,
            "avg_price": 149.99,
            "promo_days": 8,
            "holiday_days": 2,
            "lag1": 150.0,
            "lag2": 140.0,
            "rolling3": 145.0,
            "current_inventory": 180,
            "request_id": "test-custom-123"
        }
        res = self.client.post("/api/predict/custom", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["category"], "Electronics")
        self.assertEqual(data["request_id"], "test-custom-123")
        self.assertGreater(data["predicted_demand"], 0)
        self.assertIsNotNone(data["inventory_analysis"])
        self.assertEqual(data["model_version"], "2.0.0")

    def test_http_custom_prediction_validation_rejections(self):
        """Test that invalid numeric inputs are rejected with 422 Unprocessable Entity."""
        base = {
            "category": "Electronics",
            "month_num": 11,
            "avg_price": 100.0,
            "promo_days": 5,
            "holiday_days": 0,
            "lag1": 100.0,
            "lag2": 100.0,
        }

        # 1. Negative price
        bad_price = {**base, "avg_price": -10.0}
        self.assertEqual(self.client.post("/api/predict/custom", json=bad_price).status_code, 422)

        # 2. Zero price
        zero_price = {**base, "avg_price": 0.0}
        self.assertEqual(self.client.post("/api/predict/custom", json=zero_price).status_code, 422)

        # 3. Negative promo days
        bad_promo = {**base, "promo_days": -1}
        self.assertEqual(self.client.post("/api/predict/custom", json=bad_promo).status_code, 422)

        # 4. Negative lag
        bad_lag = {**base, "lag1": -50.0}
        self.assertEqual(self.client.post("/api/predict/custom", json=bad_lag).status_code, 422)

        # 5. Negative inventory
        bad_inv = {**base, "current_inventory": -10}
        self.assertEqual(self.client.post("/api/predict/custom", json=bad_inv).status_code, 422)

        # 6. Invalid month number (0 or 13)
        bad_month = {**base, "month_num": 13}
        self.assertEqual(self.client.post("/api/predict/custom", json=bad_month).status_code, 422)

        # 7. Promo days exceeding calendar days in month (February month 2, 30 promo days)
        bad_feb = {**base, "month_num": 2, "promo_days": 30}
        self.assertEqual(self.client.post("/api/predict/custom", json=bad_feb).status_code, 422)

        # 8. Holiday days exceeding calendar days in month (April month 4, 35 holiday days)
        bad_holiday = {**base, "month_num": 4, "holiday_days": 35}
        self.assertEqual(self.client.post("/api/predict/custom", json=bad_holiday).status_code, 422)

    def test_http_batch_prediction_with_partial_failures(self):
        """Test POST /api/predict/batch with mixed valid and invalid items (error isolation)."""
        batch_payload = {
            "items": [
                {
                    "request_id": "item-0-valid-beauty",
                    "category": "Beauty",
                    "month_num": 5,
                    "avg_price": 25.0,
                    "promo_days": 2,
                    "holiday_days": 0,
                    "lag1": 80.0,
                    "lag2": 75.0,
                    "rolling3": 77.0,
                    "current_inventory": 90,
                },
                {
                    "request_id": "item-1-invalid-cat",
                    "category": "NonExistentCategory",
                    "month_num": 5,
                    "avg_price": 30.0,
                    "promo_days": 0,
                    "holiday_days": 0,
                    "lag1": 50.0,
                    "lag2": 50.0,
                },
                {
                    "request_id": "item-2-valid-clothing",
                    "category": "Clothing",
                    "month_num": 12,
                    "avg_price": 60.0,
                    "promo_days": 10,
                    "holiday_days": 3,
                    "lag1": 150.0,
                    "lag2": 140.0,
                    "rolling3": 145.0,
                    "current_inventory": 200,
                }
            ]
        }
        res = self.client.post("/api/predict/batch", json=batch_payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total_items"], 3)
        self.assertEqual(data["successful_items"], 2)
        self.assertEqual(data["failed_items"], 1)
        self.assertEqual(len(data["results"]), 3)

        # Check item 0
        self.assertEqual(data["results"][0]["request_id"], "item-0-valid-beauty")
        self.assertTrue(data["results"][0]["success"])
        self.assertIsNotNone(data["results"][0]["prediction"])
        self.assertEqual(data["results"][0]["prediction"]["category"], "Beauty")

        # Check item 1 (isolated failure)
        self.assertEqual(data["results"][1]["request_id"], "item-1-invalid-cat")
        self.assertFalse(data["results"][1]["success"])
        self.assertIn("category", data["results"][1]["error"].lower())
        self.assertIsNone(data["results"][1]["prediction"])

        # Check item 2
        self.assertEqual(data["results"][2]["request_id"], "item-2-valid-clothing")
        self.assertTrue(data["results"][2]["success"])
        self.assertIsNotNone(data["results"][2]["prediction"])

    def test_http_ml_status_and_models_endpoints(self):
        """Test GET /api/ml/status and GET /api/models."""
        res = self.client.get("/api/ml/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total_supported"], 4)
        self.assertEqual(len(data["models"]), 4)
        for model_info in data["models"]:
            self.assertIn(model_info["category"], SUPPORTED_CATEGORIES)
            self.assertTrue(model_info["file_exists"])
            self.assertEqual(model_info["model_version"], "2.0.0")
            self.assertGreater(model_info["residual_std"], 0)

        # Check /api/models alias
        res_alias = self.client.get("/api/models")
        self.assertEqual(res_alias.status_code, 200)
        self.assertEqual(res_alias.json()["total_supported"], 4)

    def test_http_benchmark_and_feature_schema_endpoints(self):
        """Test GET /api/ml/benchmark and GET /api/ml/feature-schema."""
        res_bench = self.client.get("/api/ml/benchmark")
        self.assertEqual(res_bench.status_code, 200)
        bench_data = res_bench.json()
        self.assertIn("scorecard", bench_data)
        self.assertIn("aggregate_metrics", bench_data)
        self.assertEqual(len(bench_data["categories"]), 4)

        res_schema = self.client.get("/api/ml/feature-schema")
        self.assertEqual(res_schema.status_code, 200)
        schema_data = res_schema.json()
        self.assertEqual(schema_data["version"], "2.0.0")
        self.assertEqual(len(schema_data["features"]), 7)

    @patch("app.routers.predictions.predict_next_month")
    def test_http_missing_model_returns_503(self, mock_predict):
        """Test that missing model artifact raises 503 Service Unavailable."""
        mock_predict.side_effect = ModelNotFoundError("Model artifact for 'Beauty' is missing.")
        res = self.client.get("/api/predict/Beauty")
        self.assertEqual(res.status_code, 503)
        self.assertIn("missing", res.json()["detail"])

    @patch("app.routers.predictions.predict_next_month")
    def test_http_corrupted_model_returns_500(self, mock_predict):
        """Test that corrupted model artifact raises 500 Internal Server Error."""
        mock_predict.side_effect = ModelCorruptedError("Model artifact for 'Beauty' is corrupted.")
        res = self.client.get("/api/predict/Beauty")
        self.assertEqual(res.status_code, 500)
        self.assertIn("corrupted", res.json()["detail"])


if __name__ == "__main__":
    unittest.main()

