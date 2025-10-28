"""Folder management API endpoints"""
from fastapi import APIRouter, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import List, Optional
import os
from pathlib import Path
import json
import asyncio

from app.database import db
from app.services.scanner import scan_folders, scan_folders_with_progress

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


@router.websocket("/ws/scan")
async def websocket_scan_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time scan progress"""
    await websocket.accept()

    try:
        # Receive scan request
        data = await websocket.receive_text()
        request_data = json.loads(data)
        folder_paths = request_data.get('paths', [])

        if not folder_paths:
            await websocket.send_json({
                "type": "error",
                "message": "No folder paths provided"
            })
            await websocket.close()
            return

        # Add folders to tracking
        with db.get_connection() as conn:
            for path in folder_paths:
                conn.execute(
                    "INSERT OR IGNORE INTO folders (path, status) VALUES (?, ?)",
                    (path, "pending")
                )
            conn.commit()

        # Define progress callback
        async def send_progress(phase: str, progress: int, message: str):
            try:
                await websocket.send_json({
                    "type": "progress",
                    "phase": phase,
                    "progress": progress,
                    "message": message
                })
            except Exception as e:
                print(f"Error sending progress: {e}")

        # Run scan in thread pool to avoid blocking
        loop = asyncio.get_event_loop()

        def progress_callback(phase, progress, message):
            asyncio.run_coroutine_threadsafe(
                send_progress(phase, progress, message),
                loop
            )

        # Run scan
        await loop.run_in_executor(
            None,
            lambda: scan_folders_with_progress(folder_paths, progress_callback)
        )

        # Send completion message
        await websocket.send_json({
            "type": "complete",
            "message": "Scan completed successfully"
        })

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass
