"""Folder management API endpoints"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
import os
from pathlib import Path

from app.database import db
from app.services.scanner import scan_folders

router = APIRouter()


class FolderBrowseResponse(BaseModel):
    path: str
    directories: List[str]
    parent: Optional[str]


class ScannedFolder(BaseModel):
    id: int
    path: str
    last_scanned: Optional[str]
    sample_count: int
    status: str


class ScanRequest(BaseModel):
    paths: List[str]


@router.get("/browse")
async def browse_filesystem(path: str = None):
    """Browse filesystem directories"""
    try:
        # Default to user's home directory
        if path is None or path == "":
            path = str(Path.home())

        target_path = Path(path).resolve()

        if not target_path.exists():
            raise HTTPException(status_code=404, detail="Path does not exist")

        if not target_path.is_dir():
            raise HTTPException(status_code=400, detail="Path is not a directory")

        # Get directories only
        directories = []
        try:
            for item in sorted(target_path.iterdir()):
                if item.is_dir() and not item.name.startswith('.'):
                    directories.append(item.name)
        except PermissionError:
            raise HTTPException(status_code=403, detail="Permission denied")

        parent = str(target_path.parent) if target_path.parent != target_path else None

        return {
            "path": str(target_path),
            "directories": directories,
            "parent": parent
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scanned")
async def get_scanned_folders():
    """Get all scanned folders"""
    with db.get_connection() as conn:
        cursor = conn.execute(
            "SELECT id, path, last_scanned, sample_count, status FROM folders ORDER BY last_scanned DESC"
        )
        folders = [dict(row) for row in cursor.fetchall()]
        return {"folders": folders}


@router.post("/scan")
async def start_scan(request: ScanRequest, background_tasks: BackgroundTasks):
    """Start scanning folder(s) - scans happen in background"""
    # Add folders to tracking
    with db.get_connection() as conn:
        for path in request.paths:
            conn.execute(
                "INSERT OR IGNORE INTO folders (path, status) VALUES (?, ?)",
                (path, "pending")
            )
        conn.commit()

    # Start scanning in background
    background_tasks.add_task(scan_folders, request.paths)

    return {
        "status": "started",
        "message": f"Scan initiated for {len(request.paths)} folder(s)",
        "paths": request.paths
    }


@router.delete("/{folder_id}")
async def remove_folder(folder_id: int):
    """Remove folder from tracking"""
    with db.get_connection() as conn:
        cursor = conn.execute("DELETE FROM folders WHERE id = ?", (folder_id,))
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Folder not found")

        return {"status": "deleted", "id": folder_id}
