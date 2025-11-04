"""Database management endpoints"""

import logging
import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db_connection import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/database", tags=["database"])


class DatabaseStatus(BaseModel):
    """Database status response"""

    exists: bool
    path: str
    writable: bool
    size: int | None = None
    samples_count: int | None = None


class DatabaseInitRequest(BaseModel):
    """Database initialization request"""

    mode: str  # "load" or "create"
    path: str
    name: str | None = None  # Only for create mode


class DatabaseInitResponse(BaseModel):
    """Database initialization response"""

    success: bool
    path: str
    error: str | None = None


@router.get("/status", response_model=DatabaseStatus)
async def get_database_status() -> dict[str, Any]:
    """
    Check if database exists and is accessible

    Returns:
        DatabaseStatus with current database state
    """
    db_path = db.db_path
    exists = os.path.exists(db_path)

    # Check if parent directory is writable
    parent_dir = Path(db_path).parent
    writable = os.access(parent_dir, os.W_OK) if parent_dir.exists() else False

    size = None
    samples_count = None

    if exists:
        try:
            size = os.path.getsize(db_path)

            # Validate database has proper schema
            with db.get_connection() as conn:
                # Check if required tables exist
                cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = {row[0] for row in cursor.fetchall()}
                required_tables = {"files", "tags", "collections"}

                if not required_tables.issubset(tables):
                    # Database exists but is invalid/empty
                    logger.warning(f"Database file exists but missing required tables")
                    exists = False
                    size = None
                else:
                    # Get sample count
                    cursor = conn.execute("SELECT COUNT(*) FROM files WHERE indexed = 1")
                    samples_count = cursor.fetchone()[0]
        except Exception as e:
            logger.warning(f"Could not read database info: {e}")
            # If we can't read the database, consider it as not existing
            exists = False
            size = None

    return {
        "exists": exists,
        "path": db_path,
        "writable": writable,
        "size": size,
        "samples_count": samples_count,
    }


@router.post("/initialize", response_model=DatabaseInitResponse)
async def initialize_database(request: DatabaseInitRequest) -> dict[str, Any]:
    """
    Initialize database - either load existing or create new

    Args:
        request: Database initialization request with mode and path

    Returns:
        DatabaseInitResponse with success status and path
    """
    try:
        if request.mode == "load":
            # Load existing database
            db_path = request.path

            # Validate path
            if not os.path.exists(db_path):
                raise HTTPException(status_code=400, detail="Database file not found")

            if not db_path.endswith(".db"):
                raise HTTPException(status_code=400, detail="Invalid database file extension")

            # Check if it's a valid SQLite database
            try:
                import sqlite3

                conn = sqlite3.connect(db_path)
                cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = [row[0] for row in cursor.fetchall()]
                conn.close()

                # Check for required tables
                required_tables = ["files", "tags", "collections"]
                missing_tables = [t for t in required_tables if t not in tables]
                if missing_tables:
                    raise HTTPException(
                        status_code=400, detail=f"Invalid database schema. Missing tables: {', '.join(missing_tables)}"
                    )
            except sqlite3.Error as e:
                raise HTTPException(status_code=400, detail=f"Invalid database file: {str(e)}") from e

            # Update database path
            db.db_path = db_path
            logger.info(f"Loaded existing database from: {db_path}")

            return {
                "success": True,
                "path": db_path,
                "error": None,
            }

        if request.mode == "create":
            # Create new database
            folder_path = request.path
            db_name = request.name or "samples.db"

            # Ensure .db extension
            if not db_name.endswith(".db"):
                db_name += ".db"

            db_path = os.path.join(folder_path, db_name)

            # Check if folder exists and is writable
            if not os.path.exists(folder_path):
                raise HTTPException(status_code=400, detail="Folder does not exist")

            if not os.access(folder_path, os.W_OK):
                raise HTTPException(status_code=400, detail="Folder is not writable")

            # Check if database already exists and is valid
            if os.path.exists(db_path):
                # Check if it's a valid database with tables
                try:
                    import sqlite3

                    conn = sqlite3.connect(db_path)
                    cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
                    tables = {row[0] for row in cursor.fetchall()}
                    conn.close()

                    required_tables = {"files", "tags", "collections"}
                    if required_tables.issubset(tables):
                        raise HTTPException(status_code=400, detail="Database file already exists at this location")
                    # If tables are missing, we'll overwrite/reinitialize
                    logger.info(f"Existing database file at {db_path} is invalid, will reinitialize")
                except sqlite3.Error:
                    # If we can't read it, we'll overwrite it
                    logger.info(f"Existing file at {db_path} is not a valid database, will overwrite")

            # Create new database
            db.db_path = db_path
            db._ensure_database()

            logger.info(f"Created new database at: {db_path}")

            return {
                "success": True,
                "path": db_path,
                "error": None,
            }

        raise HTTPException(status_code=400, detail="Invalid mode. Must be 'load' or 'create'")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        return {
            "success": False,
            "path": "",
            "error": str(e),
        }


@router.get("/info")
async def get_database_info() -> dict[str, Any]:
    """
    Get detailed database information

    Returns:
        Database metadata including size, counts, etc.
    """
    try:
        db_path = db.db_path

        if not os.path.exists(db_path):
            raise HTTPException(status_code=404, detail="Database not found")

        with db.get_connection() as conn:
            # Get counts
            samples = conn.execute("SELECT COUNT(*) FROM files WHERE indexed = 1").fetchone()[0]
            tags = conn.execute("SELECT COUNT(*) FROM tags").fetchone()[0]
            collections = conn.execute("SELECT COUNT(*) FROM collections").fetchone()[0]
            folders = conn.execute("SELECT COUNT(DISTINCT folder_id) FROM files WHERE indexed = 1").fetchone()[0]

            # Get database file info
            stat = os.stat(db_path)

            return {
                "path": db_path,
                "size": stat.st_size,
                "created": stat.st_ctime,
                "modified": stat.st_mtime,
                "samples": samples,
                "tags": tags,
                "collections": collections,
                "folders": folders,
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get database info: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e
