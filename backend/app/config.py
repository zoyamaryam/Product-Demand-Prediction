import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent  # points to /backend
load_dotenv(BASE_DIR / ".env")

DATABASE_PATH = BASE_DIR / "data" / "processed" / "app.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

RAW_DATA_PATH = BASE_DIR / "data" / "raw" / "retail_demand_cleaned.csv"

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:4b")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")