"""FastAPI application entry point"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import ALLOWED_ORIGINS, FRONTEND_BUILD_DIR
from app.database import db
from app.routers import folders, samples, tags, collections, search

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting Audio Sample Manager backend...")
    health = db.check_health()
    logger.info(f"Database health: {'OK' if health else 'FAILED'}")

    yield

    # Shutdown
    logger.info("Shutting down Audio Sample Manager backend...")


# Create FastAPI app
app = FastAPI(
    title="Audio Sample Manager API",
    description="API for managing audio sample libraries",
    version="0.1.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(folders.router, prefix="/api/folders", tags=["folders"])
app.include_router(samples.router, prefix="/api/samples", tags=["samples"])
app.include_router(tags.router, prefix="/api/tags", tags=["tags"])
app.include_router(collections.router, prefix="/api/collections", tags=["collections"])
app.include_router(search.router, prefix="/api/search", tags=["search"])


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    db_healthy = db.check_health()
    return {
        "status": "healthy" if db_healthy else "unhealthy",
        "database": db_healthy
    }


@app.post("/api/database/clear")
async def clear_all_data():
    """Clear all data from the database"""
    success = db.clear_all_data()
    if success:
        return {
            "status": "success",
            "message": "All data has been cleared from the database"
        }
    else:
        return {
            "status": "error",
            "message": "Failed to clear data from database"
        }


# Serve frontend static files in production
if FRONTEND_BUILD_DIR.exists():
    # Mount static assets directory
    assets_dir = FRONTEND_BUILD_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
        logger.info(f"Serving static assets from: {assets_dir}")

    @app.get("/")
    async def serve_root():
        """Serve the frontend root page"""
        index_path = FRONTEND_BUILD_DIR / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        return {"message": "Frontend not found"}

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
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
