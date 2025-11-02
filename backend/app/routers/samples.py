"""Sample management API endpoints"""

import os
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.config import ITEMS_PER_PAGE
from app.db_connection import get_db_connection

router = APIRouter()

# Check if demo mode
DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"

if DEMO_MODE:
    from app.demo.scanner import get_demo_audio_path


class File(BaseModel):
    id: int
    file_hash: str
    format: str
    file_size: int | None = None
    duration: float | None = None
    sample_rate: int | None = None
    bit_depth: int | None = None
    channels: int | None = None
    alias: str | None = None


class FileUpdate(BaseModel):
    alias: str | None = None


@router.get("")
async def list_files(
    request: Request,
    page: int = 1,
    limit: int = ITEMS_PER_PAGE,
    folder_id: int | None = None,
    tags: str | None = None,
    exclude_tags: str | None = None,
):
    """List files with pagination and optional filtering by folder and tags"""
    offset = (page - 1) * limit

    with get_db_connection(request) as conn:
        # Parse tag IDs
        include_tag_ids = [int(tid) for tid in tags.split(",")] if tags else []
        exclude_tag_ids = [int(tid) for tid in exclude_tags.split(",")] if exclude_tags else []

        # Build query - join files with file_locations
        if include_tag_ids or exclude_tag_ids:
            # Use subquery to filter by tags, inner join on file_location will only
            # return files that have locations.
            query = """
                SELECT DISTINCT f.*, fl.file_path as filepath, fl.file_name as filename
                FROM files f
                JOIN file_locations fl ON f.id = fl.file_id AND fl.is_primary = 1
                WHERE f.indexed = 1
            """
            params = []

            # Include tags filter (file must have ALL included tags)
            if include_tag_ids:
                for tag_id in include_tag_ids:
                    query += " AND EXISTS (SELECT 1 FROM file_tags ft WHERE ft.file_id = f.id AND ft.tag_id = ?)"
                    params.append(tag_id)

            # Exclude tags filter (file must NOT have ANY excluded tags)
            if exclude_tag_ids:
                placeholders = ",".join("?" * len(exclude_tag_ids))
                query += f" AND NOT EXISTS (SELECT 1 FROM file_tags ft WHERE ft.file_id = f.id AND ft.tag_id IN ({placeholders}))"
                params.extend(exclude_tag_ids)

            if folder_id:
                folder = conn.execute("SELECT path FROM folders WHERE id = ?", (folder_id,)).fetchone()
                if folder:
                    query += " AND fl.file_path LIKE ?"
                    params.append(f"{folder['path']}%")

            query += " ORDER BY fl.file_name LIMIT ? OFFSET ?"
            params.extend([limit, offset])
        else:
            # No tag filtering - simpler query
            query = """
                SELECT DISTINCT f.*, fl.file_path as filepath, fl.file_name as filename
                FROM files f
                JOIN file_locations fl ON f.id = fl.file_id AND fl.is_primary = 1
                WHERE f.indexed = 1
            """
            params = []

            if folder_id:
                folder = conn.execute("SELECT path FROM folders WHERE id = ?", (folder_id,)).fetchone()
                if folder:
                    query += " AND fl.file_path LIKE ?"
                    params.append(f"{folder['path']}%")

            query += " ORDER BY fl.file_name LIMIT ? OFFSET ?"
            params.extend([limit, offset])

        cursor = conn.execute(query, params)
        files = [dict(row) for row in cursor.fetchall()]

        # Get tags for each file
        for file in files:
            tags_cursor = conn.execute(
                """
                SELECT t.id, t.name, t.color, ft.confidence
                FROM tags t
                JOIN file_tags ft ON t.id = ft.tag_id
                WHERE ft.file_id = ?
                ORDER BY t.name
                """,
                (file["id"],),
            )
            file["tags"] = [dict(row) for row in tags_cursor.fetchall()]

            # Get collections for each file
            collections_cursor = conn.execute(
                """
                SELECT c.id, c.name, c.description
                FROM collections c
                JOIN collection_items ci ON c.id = ci.collection_id
                WHERE ci.file_id = ?
                ORDER BY c.name
                """,
                (file["id"],),
            )
            file["collections"] = [dict(row) for row in collections_cursor.fetchall()]

        # Get total count with same filters
        if include_tag_ids or exclude_tag_ids:
            count_query = """
                SELECT COUNT(DISTINCT f.id) as total
                FROM files f
                JOIN file_locations fl ON f.id = fl.file_id AND fl.is_primary = 1
                WHERE f.indexed = 1
            """
            count_params = []

            if include_tag_ids:
                for tag_id in include_tag_ids:
                    count_query += " AND EXISTS (SELECT 1 FROM file_tags ft WHERE ft.file_id = f.id AND ft.tag_id = ?)"
                    count_params.append(tag_id)

            if exclude_tag_ids:
                placeholders = ",".join("?" * len(exclude_tag_ids))
                count_query += f" AND NOT EXISTS (SELECT 1 FROM file_tags ft WHERE ft.file_id = f.id AND ft.tag_id IN ({placeholders}))"
                count_params.extend(exclude_tag_ids)

            if folder_id:
                folder = conn.execute("SELECT path FROM folders WHERE id = ?", (folder_id,)).fetchone()
                if folder:
                    count_query += " AND fl.file_path LIKE ?"
                    count_params.append(f"{folder['path']}%")
        else:
            count_query = """
                SELECT COUNT(DISTINCT f.id) as total
                FROM files f
                JOIN file_locations fl ON f.id = fl.file_id AND fl.is_primary = 1
                WHERE f.indexed = 1
            """
            count_params = []
            if folder_id:
                folder = conn.execute("SELECT path FROM folders WHERE id = ?", (folder_id,)).fetchone()
                if folder:
                    count_query += " AND fl.file_path LIKE ?"
                    count_params.append(f"{folder['path']}%")

        total = conn.execute(count_query, count_params).fetchone()["total"]

        return {
            "samples": files,
            "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit},
        }


@router.get("/{file_id}")
async def get_file(request: Request, file_id: int):
    """Get file details including tags and locations"""
    with get_db_connection(request) as conn:
        # Get file with primary location
        file = conn.execute(
            """
            SELECT f.*, fl.file_path as filepath, fl.file_name as filename
            FROM files f
            JOIN file_locations fl ON f.id = fl.file_id AND fl.is_primary = 1
            WHERE f.id = ?
            """,
            (file_id,),
        ).fetchone()

        if not file:
            raise HTTPException(status_code=404, detail="File not found")

        # Get tags
        tags = conn.execute(
            """
            SELECT t.id, t.name, t.color, ft.confidence
            FROM tags t
            JOIN file_tags ft ON t.id = ft.tag_id
            WHERE ft.file_id = ?
        """,
            (file_id,),
        ).fetchall()

        # Get collections
        collections = conn.execute(
            """
            SELECT c.id, c.name, c.description
            FROM collections c
            JOIN collection_items ci ON c.id = ci.collection_id
            WHERE ci.file_id = ?
            ORDER BY c.name
        """,
            (file_id,),
        ).fetchall()

        result = dict(file)
        result["tags"] = [dict(tag) for tag in tags]
        result["collections"] = [dict(collection) for collection in collections]

        return result


@router.get("/{file_id}/audio")
async def stream_audio(request: Request, file_id: int):
    """Stream audio file for playback"""
    with get_db_connection(request) as conn:
        file = conn.execute(
            """
            SELECT f.format, fl.file_path
            FROM files f
            JOIN file_locations fl ON f.id = fl.file_id AND fl.is_primary = 1
            WHERE f.id = ?
            """,
            (file_id,),
        ).fetchone()

        if not file:
            raise HTTPException(status_code=404, detail="File not found")

        filepath_str = file["file_path"]

        # In demo mode, serve from demo audio folder
        if DEMO_MODE and filepath_str.startswith("/demo/audio/"):
            demo_root = get_demo_audio_path()
            # Remove /demo/audio/ prefix and construct path
            relative_path = filepath_str.replace("/demo/audio/", "")
            filepath = demo_root / relative_path
        else:
            filepath = Path(filepath_str)

        if not filepath.exists():
            raise HTTPException(status_code=404, detail="Audio file not found on disk")

        # Determine media type from format
        format_to_mime = {
            "wav": "audio/wav",
            "mp3": "audio/mpeg",
            "flac": "audio/flac",
            "aiff": "audio/aiff",
            "ogg": "audio/ogg",
            "m4a": "audio/mp4",
        }
        media_type = format_to_mime.get(file["format"].replace(".", ""), "audio/*")

        return FileResponse(
            filepath,
            media_type=media_type,
            filename=filepath.name,
            headers={
                "Accept-Ranges": "bytes",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*",
            },
        )


@router.put("/{file_id}")
async def update_file(request: Request, file_id: int, update: FileUpdate):
    """Update file metadata (alias)"""
    with get_db_connection(request) as conn:
        fields = []
        params = []

        if update.alias is not None:
            fields.append("alias = ?")
            params.append(update.alias)

        if not fields:
            return {"status": "no changes"}

        params.append(file_id)
        query = f"UPDATE files SET {', '.join(fields)} WHERE id = ?"

        cursor = conn.execute(query, params)
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="File not found")

        return {"status": "updated", "id": file_id}


@router.delete("/{file_id}")
async def delete_file(request: Request, file_id: int):
    """Delete file record (cascades to locations, tags, etc.)"""
    with get_db_connection(request) as conn:
        cursor = conn.execute("DELETE FROM files WHERE id = ?", (file_id,))
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="File not found")

        return {"status": "deleted", "id": file_id}
