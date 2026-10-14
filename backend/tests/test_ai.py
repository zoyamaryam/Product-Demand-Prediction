import unittest
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import SessionLocal
from app.analytics import get_executive_summary, get_category_trends
from app.ml import predict_all_categories
from app.recommendations import generate_recommendations
from app.ai import _generate_analytical_fallback_insight, _answer_question_fallback


class TestAI(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.summary = get_executive_summary(self.db)
        self.category_trends = get_category_trends(self.db)
        self.predictions = predict_all_categories(self.db)
        self.recommendations = generate_recommendations(self.db)
        self.context = {
            "summary": self.summary,
            "category_trends": self.category_trends,
            "predictions": self.predictions,
            "recommendations": self.recommendations,
        }

    def tearDown(self):
        self.db.close()

    def test_analytical_fallback_insight(self):
        insight = _generate_analytical_fallback_insight(
            self.summary, self.category_trends, self.predictions, self.recommendations
        )
        self.assertIsInstance(insight, str)
        self.assertGreater(len(insight), 50)
        self.assertIn("Total business revenue", insight)
        self.assertIn("Clothing", insight)

    def test_answer_question_fallback_stockout(self):
        answer = _answer_question_fallback("Which category has the highest stockout risk?", self.context)
        self.assertIsInstance(answer, str)
        self.assertIn("stockout", answer.lower())

    def test_answer_question_fallback_beauty(self):
        answer = _answer_question_fallback("Should I be worried about Beauty inventory?", self.context)
        self.assertIsInstance(answer, str)
        self.assertIn("beauty", answer.lower())


if __name__ == "__main__":
    unittest.main()
