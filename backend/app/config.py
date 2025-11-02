"""Application configuration"""

from pathlib import Path

# Database
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)
DATABASE_PATH = str(DATA_DIR / "samples.db")

# Audio settings
AUDIO_FORMATS = [".wav", ".mp3", ".flac", ".aiff", ".ogg", ".m4a"]
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB
SCAN_BATCH_SIZE = 1000

# Server settings
HOST = "127.0.0.1"
PORT = 8000

# Frontend settings (for production build)
# Use demo-dist for Railway demo deployment, dist for local production
import os
FRONTEND_BUILD_DIR = BASE_DIR.parent / "frontend" / ("demo-dist" if os.getenv("DEMO_MODE") else "dist")

# Pagination
ITEMS_PER_PAGE = 100

# CORS
ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:8000",  # Production
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8000",
]

# In demo mode (Railway), allow all origins for the demo deployment
if os.getenv("DEMO_MODE", "false").lower() == "true":
    ALLOWED_ORIGINS = ["*"]
