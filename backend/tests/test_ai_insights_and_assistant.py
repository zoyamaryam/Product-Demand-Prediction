import unittest
import sys
from pathlib import Path
from unittest.mock import patch

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import SessionLocal
from app.analytics import get_executive_summary
from app.recommendations import get_inventory_intelligence, get_pricing_insights
from app.ai import (
    generate_structured_insights,
    answer_business_question,
    call_gemini,
    call_ollama,
    call_llm,
)
from fastapi.testclient import TestClient
from app.main import app


class TestAIInsightsAndAssistant(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.client = TestClient(app)

    def tearDown(self):
        self.db.close()

    # ---------------- 1. Structured Insight Engine Tests ---------------- #

    def test_structured_insights_generation_and_schema_fields(self):
        """Verify each insight adheres to all required schema fields and conventions."""
        insights = generate_structured_insights(self.db)
        self.assertIsInstance(insights, list)
        self.assertGreaterEqual(len(insights), 4)

        seen_ids = set()
        for ins in insights:
            # Unique ID
            self.assertIn("id", ins)
            self.assertNotIn(ins["id"], seen_ids, f"Duplicate insight ID detected: {ins['id']}")
            seen_ids.add(ins["id"])

            # Required metadata
            self.assertIn("title", ins)
            self.assertIn("explanation", ins)
            self.assertIn("category", ins)
            self.assertIn(ins["category"], [
                "demand_trends", "inventory_risk", "pricing_promotion", "forecast_limitations", "seasonality"
            ])
            self.assertIn("severity", ins)
            self.assertIn(ins["severity"], ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"])
            self.assertIn("supporting_metrics", ins)
            self.assertIsInstance(ins["supporting_metrics"], dict)
            self.assertIn("data_source", ins)
            self.assertIn("evidence_quality", ins)
            self.assertIn(ins["evidence_quality"], [
                "HIGH_EMPIRICAL", "MODEL_BENCHMARK", "ESTIMATED_RUN_RATE", "PROPORTIONAL_APPROXIMATION"
            ])
            self.assertIn("limitations", ins)
            self.assertIsInstance(ins["limitations"], list)
            self.assertGreater(len(ins["limitations"]), 0)

    def test_no_contradictory_or_duplicate_insights(self):
        """Verify no category is simultaneously classified as both Stockout Risk and Surplus Overstock."""
        insights = generate_structured_insights(self.db)
        inv_insights = [i for i in insights if i["category"] == "inventory_risk"]

        stockout_cats = set()
        overstock_cats = set()
        for i in inv_insights:
            cat = i.get("category_name")
            if "STOCKOUT" in i["id"]:
                stockout_cats.add(cat)
            elif "SURPLUS" in i["id"]:
                overstock_cats.add(cat)

        # Intersection must be empty (no contradictory inventory classifications)
        overlap = stockout_cats.intersection(overstock_cats)
        self.assertEqual(len(overlap), 0, f"Contradictory classification detected for: {overlap}")

    def test_structured_insights_category_filter(self):
        """Test optional category filtering on structured insight generation."""
        insights_clothing = generate_structured_insights(self.db, category="Clothing")
        for i in insights_clothing:
            if i.get("category_name"):
                self.assertEqual(i["category_name"], "Clothing")

    # ---------------- 2. Business Question Answering Tests ---------------- #

    def test_question_greatest_inventory_risk(self):
        """Q1: 'Which categories show the greatest inventory risk?'"""
        res = answer_business_question("Which categories show the greatest inventory risk?", self.db)
        self.assertEqual(res["intent"], "inventory_risk")
        self.assertEqual(res["data_type"], "INVENTORY_POLICY")
        self.assertIn("Clothing", res["answer"])
        self.assertIn("stockout", res["answer"].lower())
        self.assertIn("2025-01", res["period"])
        self.assertIn("lead time", res["answer"].lower())
        self.assertIn("automated purchasing is disabled", res["answer"].lower())
        self.assertGreater(res["supporting_metrics"]["total_suggested_reorder_units"], 0)

    def test_question_products_need_replenishment(self):
        """Q2: 'Which products need replenishment, and why?'"""
        res = answer_business_question("Which products need replenishment, and why?", self.db)
        self.assertEqual(res["intent"], "product_replenishment")
        self.assertEqual(res["data_type"], "INVENTORY_POLICY")
        self.assertIn("replenishment is urgently recommended", res["answer"].lower())
        self.assertIn("reorder", res["answer"].lower())
        self.assertIn("lead-time", res["answer"].lower())
        self.assertIn("automated purchasing is disabled", res["answer"].lower())
        self.assertGreater(len(res["recommendations"]), 0)

    def test_question_demand_patterns_history(self):
        """Q3: 'What demand patterns appear in the available history?'"""
        summary = get_executive_summary(self.db)
        res = answer_business_question("What demand patterns appear in the available history?", self.db)
        self.assertEqual(res["intent"], "demand_patterns")
        self.assertEqual(res["data_type"], "HISTORICAL_OBSERVATION")
        self.assertIn("48-month", res["answer"])
        self.assertIn("December 2024", res["answer"])
        # Check metric consistency with actual revenue
        self.assertIn(f"${summary['total_revenue']:,.2f}", res["answer"])
        self.assertIn("season", res["answer"].lower())
        self.assertIn("holiday", res["answer"].lower())

    def test_question_forecast_limitations(self):
        """Q4: 'What limitations should I consider when using these forecasts?'"""
        res = answer_business_question("What limitations should I consider when using these forecasts?", self.db)
        self.assertEqual(res["intent"], "forecast_limitations")
        self.assertEqual(res["data_type"], "LIMITATION")
        self.assertIn("December 2024", res["answer"])
        self.assertIn("January 2025", res["answer"])
        self.assertIn("Beauty", res["answer"])
        self.assertIn("moving average", res["answer"].lower())
        self.assertIn("lead time", res["answer"].lower())
        self.assertIn("non-causal", res["answer"].lower())

    def test_question_pricing_and_promotions(self):
        """Q5: 'What promotion and pricing patterns are observed?'"""
        res = answer_business_question("What promotion and pricing patterns are observed?", self.db)
        self.assertEqual(res["intent"], "pricing_promotions")
        self.assertEqual(res["data_type"], "HISTORICAL_OBSERVATION")
        self.assertIn("discount", res["answer"].lower())
        self.assertIn("correlation", res["answer"].lower())
        self.assertIn("does not claim", res["answer"].lower())
        self.assertIn("wholesale", res["answer"].lower())

    def test_question_executive_business_review(self):
        """Q6: 'Summarize the most important findings for a business review.'"""
        res = answer_business_question("Summarize the most important findings for a business review.", self.db)
        self.assertEqual(res["intent"], "executive_review")
        self.assertIn("Executive Business Review Summary", res["answer"])
        self.assertIn("Clothing", res["answer"])
        self.assertIn("automated purchasing is disabled", res["answer"].lower())
        self.assertIn("December 2024", res["answer"])

    # ---------------- 3. Unavailable & Ambiguous Query Handling ---------------- #

    def test_unavailable_data_inquiries(self):
        """Verify queries asking for absent fields (cost, net margins, competitor, 2026 data) are politely rejected."""
        queries = [
            "What is our net profit margin?",
            "What are our wholesale supplier costs?",
            "What is our competitor pricing benchmark?",
            "Show me sales transactions for October 2026",
        ]
        for q in queries:
            res = answer_business_question(q, self.db)
            self.assertEqual(res["intent"], "unavailable_data")
            self.assertEqual(res["data_type"], "UNAVAILABLE")
            self.assertIn("unavailable in demandiq", res["answer"].lower())

    def test_ambiguous_inquiries_return_clarification(self):
        """Verify underspecified queries return clarifying questions."""
        ambiguous_queries = ["price?", "buy?", "help", "future"]
        for q in ambiguous_queries:
            res = answer_business_question(q, self.db)
            self.assertEqual(res["intent"], "ambiguous")
            self.assertEqual(res["data_type"], "AMBIGUOUS")
            self.assertIsNotNone(res["clarifying_question"])

    def test_empty_and_oversized_queries(self):
        """Verify empty and excessively long queries are handled gracefully."""
        res_empty = answer_business_question("   ", self.db)
        self.assertEqual(res_empty["intent"], "empty_query")

        res_long = answer_business_question("a" * 1200, self.db)
        self.assertEqual(res_long["intent"], "oversized_query")

    # ---------------- 4. Protection Against Fabricated Claims ---------------- #

    def test_protection_against_automated_order_execution_claims(self):
        """The assistant must never claim an order was placed or executed."""
        res = answer_business_question("Place a purchase order for Clothing now", self.db)
        self.assertNotIn("order placed", res["answer"].lower())
        self.assertNotIn("order executed", res["answer"].lower())
        self.assertIn("automated purchasing is disabled", res["answer"].lower())

    def test_no_causal_pricing_claims(self):
        """The assistant must not claim price drops will increase gross profit."""
        res = answer_business_question("Will discounting Beauty increase my profit?", self.db)
        self.assertIn("does not claim", res["answer"].lower())
        self.assertIn("wholesale", res["answer"].lower())

    # ---------------- 5. Fallback & External LLM Failure Resilience ---------------- #

    def test_call_gemini_without_api_key_returns_empty_safely(self):
        """Verify call_gemini safely returns empty string when key is absent."""
        with patch("app.ai.GEMINI_API_KEY", ""):
            res = call_gemini("Test prompt")
            self.assertEqual(res, "")

    def test_call_ollama_offline_returns_clean_warning(self):
        """Verify call_ollama returns warning without crashing when local server is unreachable."""
        with patch("requests.post", side_effect=Exception("Connection refused")):
            res = call_ollama("Test prompt")
            self.assertTrue(res.startswith("⚠️"))

    def test_call_llm_falls_back_to_analytics_engine(self):
        """Verify call_llm falls back to DemandIQ Analytics Engine provider."""
        with patch("app.ai.GEMINI_API_KEY", ""), patch("app.ai.call_ollama", return_value="⚠️ Server offline"):
            text, provider = call_llm("Test prompt")
            self.assertEqual(text, "")
            self.assertEqual(provider, "DemandIQ Analytics Engine")

    # ---------------- 6. HTTP API Endpoint Tests ---------------- #

    def test_http_get_structured_insights(self):
        """Verify GET /api/insights/structured endpoint."""
        res = self.client.get("/api/insights/structured")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("insights", data)
        self.assertGreaterEqual(data["total_insights"], 4)
        self.assertIn("active_dataset_cycle", data)
        self.assertIn("data_disclaimer", data)

    def test_http_post_ask_assistant(self):
        """Verify POST /api/ask endpoint with rich response."""
        res = self.client.post("/api/ask", json={"question": "Which categories show the greatest inventory risk?"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["intent"], "inventory_risk")
        self.assertIn("Clothing", data["answer"])
        self.assertIn("supporting_metrics", data)
        self.assertIn("recommendations", data)
        self.assertIn("limitations", data)
        self.assertIn("disclaimer", data)


if __name__ == "__main__":
    unittest.main()
