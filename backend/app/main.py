"""FastAPI application entry point"""

import logging
import os
from collections.abc import Generator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import ALLOWED_ORIGINS, FRONTEND_BUILD_DIR
from app.db_connection import db
from app.routers import collections, database, folders, samples, search, tags

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Check if demo mode is enabled
DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"

if DEMO_MODE:
    from app.demo.middleware import DemoSessionMiddleware

    logger.info("🎭 DEMO MODE ENABLED - Using in-memory session databases")
else:
    logger.info("📦 PRODUCTION MODE - Using persistent database")


@asynccontextmanager
async def lifespan(app: FastAPI) -> Generator[None, Any, None]:  # noqa: ARG001
    """Application lifespan events"""
    # Startup
    logger.info("Starting Audio Sample Manager backend...")

    # In production mode, check if database exists before running health check
    if not DEMO_MODE:
        if db.exists():
            health = db.check_health()
            logger.info(f"Database health: {'OK' if health else 'FAILED'}")

            # Check for incomplete scans and complete them
            logger.info("Checking for incomplete folder scans...")
            from app.services.scanner import check_and_complete_incomplete_scans

            try:
                scan_stats = check_and_complete_incomplete_scans()
                if scan_stats["resumed"] > 0:
                    logger.info(
                        f"Completed {scan_stats['resumed']} incomplete scans: "
                        f"{scan_stats['completed']} samples added, {scan_stats['errors']} errors"
                    )
            except Exception as e:
                logger.error(f"Error checking incomplete scans on startup: {e}")
        else:
            logger.warning("⚠️  Database not found. User will be prompted to load or create a database.")
    else:
        # Demo mode always has database ready
        health = db.check_health()
        logger.info(f"Database health (demo mode): {'OK' if health else 'FAILED'}")

    yield

    # Shutdown
    logger.info("Shutting down Audio Sample Manager backend...")


# Create FastAPI app
app = FastAPI(
    title="Audio Sample Manager API",
    description="API for managing audio sample libraries",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add demo session middleware if in demo mode
if DEMO_MODE:
    app.add_middleware(DemoSessionMiddleware)
    logger.info("Demo session middleware enabled")

# API routes
app.include_router(database.router, prefix="/api", tags=["database"])
app.include_router(folders.router, prefix="/api/folders", tags=["folders"])
app.include_router(samples.router, prefix="/api/samples", tags=["samples"])
app.include_router(tags.router, prefix="/api/tags", tags=["tags"])
app.include_router(collections.router, prefix="/api/collections", tags=["collections"])
app.include_router(search.router, prefix="/api/search", tags=["search"])


@app.get("/api/health")
async def health_check() -> dict[str, Any]:
    """Health check endpoint"""
    db_healthy = db.check_health()
    db_path = ":memory: (demo mode)" if DEMO_MODE else str(getattr(db, "db_path", "unknown"))
    return {
        "status": "healthy" if db_healthy else "unhealthy",
        "database": db_healthy,
        "database_path": db_path,
        "demo_mode": DEMO_MODE,
    }


@app.post("/api/database/clear")
async def clear_all_data() -> dict[str, str]:
    """Clear all data from the database"""
    # Disable in demo mode
    if DEMO_MODE:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=403,
            detail="Database clearing is disabled in demo mode. Your session data is already isolated and temporary.",
        )

    success = db.clear_all_data()
    if success:
        return {"status": "success", "message": "All data has been cleared from the database"}
    return {"status": "error", "message": "Failed to clear data from database"}


# Serve frontend static files in production
if FRONTEND_BUILD_DIR.exists():
    # Mount static assets directory
    assets_dir = FRONTEND_BUILD_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
        logger.info(f"Serving static assets from: {assets_dir}")

    @app.get("/", response_model=None)
    async def serve_root() -> FileResponse | dict[str, str]:
        """Serve the frontend root page"""
        index_path = FRONTEND_BUILD_DIR / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        return {"message": "Frontend not found"}

    @app.get("/{full_path:path}", response_model=None)
    async def serve_frontend(full_path: str) -> dict[str, str] | FileResponse:
        """Serve frontend application for all non-API routes (SPA support)"""
        # Skip API routes
        if full_path.startswith("api/"):
            return {"error": "Not found"}

        # Try to serve the requested file first
        file_path = FRONTEND_BUILD_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)

        # Fallback to index.html for SPA routing
        index_path = FRONTEND_BUILD_DIR / "index.html"
        if index_path.exists():
            return FileResponse(index_path)

        return {"message": "Frontend not built"}
else:
    logger.warning("Frontend build directory not found. Run 'npm run build' in frontend directory.")
    logger.info("To build frontend: cd frontend && npm run build")
