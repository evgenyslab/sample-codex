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
    collections: str | None = None,
    exclude_collections: str | None = None,
    folders: str | None = None,
    exclude_folders: str | None = None,
    search: str | None = None,
    sort_by: str | None = None,
    sort_order: str | None = None,
):
    """List files with pagination and optional filtering by tags, collections, folders, and search"""
    offset = (page - 1) * limit

    with get_db_connection(request) as conn:
        # Parse filter parameters
        include_tag_ids = [int(tid) for tid in tags.split(",")] if tags else []
        exclude_tag_ids = [int(tid) for tid in exclude_tags.split(",")] if exclude_tags else []
        include_collection_ids = [int(cid) for cid in collections.split(",")] if collections else []
        exclude_collection_ids = [int(cid) for cid in exclude_collections.split(",")] if exclude_collections else []
        include_folders = [f.strip() for f in folders.split(",")] if folders else []
        exclude_folders_list = [f.strip() for f in exclude_folders.split(",")] if exclude_folders else []

        # Build base query with location count and orphaned status
        query = """
            SELECT DISTINCT
                f.*,
                fl.file_path as filepath,
                fl.file_name as filename,
                (SELECT COUNT(*) FROM file_locations WHERE file_id = f.id) as location_count,
                CASE
                    WHEN NOT EXISTS (
                        SELECT 1 FROM file_locations
                        WHERE file_id = f.id AND last_verified IS NOT NULL
                    ) THEN 1
                    ELSE 0
                END as is_orphaned
            FROM files f
            LEFT JOIN file_locations fl ON f.id = fl.file_id AND fl.is_primary = 1
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

        # Include collections filter (file must be in ANY included collection - OR logic)
        if include_collection_ids:
            placeholders = ",".join("?" * len(include_collection_ids))
            query += f" AND EXISTS (SELECT 1 FROM collection_items ci WHERE ci.file_id = f.id AND ci.collection_id IN ({placeholders}))"
            params.extend(include_collection_ids)

        # Exclude collections filter (file must NOT be in ANY excluded collection)
        if exclude_collection_ids:
            placeholders = ",".join("?" * len(exclude_collection_ids))
            query += f" AND NOT EXISTS (SELECT 1 FROM collection_items ci WHERE ci.file_id = f.id AND ci.collection_id IN ({placeholders}))"
            params.extend(exclude_collection_ids)

        # Include folders filter (file path must start with ANY included folder - OR logic)
        if include_folders:
            folder_conditions = " OR ".join(["fl.file_path LIKE ?" for _ in include_folders])
            query += f" AND ({folder_conditions})"
            params.extend([f"{folder.rstrip('/')}/%"  for folder in include_folders])

        # Exclude folders filter (file path must NOT start with ANY excluded folder)
        if exclude_folders_list:
            for folder in exclude_folders_list:
                query += " AND fl.file_path NOT LIKE ?"
                params.append(f"{folder.rstrip('/')}/%")

        # Legacy folder_id filter (for backward compatibility)
        if folder_id:
            folder = conn.execute("SELECT path FROM folders WHERE id = ?", (folder_id,)).fetchone()
            if folder:
                query += " AND fl.file_path LIKE ?"
                params.append(f"{folder['path'].rstrip('/')}/%")

        # Search filter (filename or filepath contains search term)
        if search:
            query += " AND (fl.file_name LIKE ? OR fl.file_path LIKE ?)"
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern])

        # Sorting
        valid_sort_columns = {
            "filename": "fl.file_name",
            "duration": "f.duration",
            "created_at": "f.id",  # Using id as proxy for created_at
        }
        sort_column = valid_sort_columns.get(sort_by, "fl.file_name")
        sort_direction = "DESC" if sort_order == "desc" else "ASC"
        query += f" ORDER BY {sort_column} {sort_direction}"

        # Pagination
        query += " LIMIT ? OFFSET ?"
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
        count_query = """
            SELECT COUNT(DISTINCT f.id) as total
            FROM files f
            LEFT JOIN file_locations fl ON f.id = fl.file_id AND fl.is_primary = 1
            WHERE f.indexed = 1
        """
        count_params = []

        # Apply same filters to count query
        if include_tag_ids:
            for tag_id in include_tag_ids:
                count_query += " AND EXISTS (SELECT 1 FROM file_tags ft WHERE ft.file_id = f.id AND ft.tag_id = ?)"
                count_params.append(tag_id)

        if exclude_tag_ids:
            placeholders = ",".join("?" * len(exclude_tag_ids))
            count_query += f" AND NOT EXISTS (SELECT 1 FROM file_tags ft WHERE ft.file_id = f.id AND ft.tag_id IN ({placeholders}))"
            count_params.extend(exclude_tag_ids)

        if include_collection_ids:
            placeholders = ",".join("?" * len(include_collection_ids))
            count_query += f" AND EXISTS (SELECT 1 FROM collection_items ci WHERE ci.file_id = f.id AND ci.collection_id IN ({placeholders}))"
            count_params.extend(include_collection_ids)

        if exclude_collection_ids:
            placeholders = ",".join("?" * len(exclude_collection_ids))
            count_query += f" AND NOT EXISTS (SELECT 1 FROM collection_items ci WHERE ci.file_id = f.id AND ci.collection_id IN ({placeholders}))"
            count_params.extend(exclude_collection_ids)

        if include_folders:
            folder_conditions = " OR ".join(["fl.file_path LIKE ?" for _ in include_folders])
            count_query += f" AND ({folder_conditions})"
            count_params.extend([f"{folder.rstrip('/')}/%"  for folder in include_folders])

        if exclude_folders_list:
            for folder in exclude_folders_list:
                count_query += " AND fl.file_path NOT LIKE ?"
                count_params.append(f"{folder.rstrip('/')}/%")

        if folder_id:
            folder = conn.execute("SELECT path FROM folders WHERE id = ?", (folder_id,)).fetchone()
            if folder:
                count_query += " AND fl.file_path LIKE ?"
                count_params.append(f"{folder['path'].rstrip('/')}/%")

        if search:
            count_query += " AND (fl.file_name LIKE ? OR fl.file_path LIKE ?)"
            search_pattern = f"%{search}%"
            count_params.extend([search_pattern, search_pattern])

        total = conn.execute(count_query, count_params).fetchone()["total"]

        return {
            "samples": files,
            "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit},
        }


@router.get("/{file_id}")
async def get_file(request: Request, file_id: int):
    """Get file details including tags and locations"""
    with get_db_connection(request) as conn:
        # Get file with primary location and location count
        file = conn.execute(
            """
            SELECT
                f.*,
                fl.file_path as filepath,
                fl.file_name as filename,
                (SELECT COUNT(*) FROM file_locations WHERE file_id = f.id) as location_count
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
            "aif": "audio/aiff",
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


class SelectAllRequest(BaseModel):
    tags: str | None = None
    exclude_tags: str | None = None
    collections: str | None = None
    exclude_collections: str | None = None
    folders: str | None = None
    exclude_folders: str | None = None
    search: str | None = None


@router.post("/select-all")
async def select_all_samples(request: Request, filters: SelectAllRequest):
    """Get all sample IDs matching the current filters (up to a limit for performance)"""
    MAX_SELECT_ALL = 10000  # Limit for performance

    with get_db_connection(request) as conn:
        # Parse filter parameters
        include_tag_ids = [int(tid) for tid in filters.tags.split(",")] if filters.tags else []
        exclude_tag_ids = [int(tid) for tid in filters.exclude_tags.split(",")] if filters.exclude_tags else []
        include_collection_ids = [int(cid) for cid in filters.collections.split(",")] if filters.collections else []
        exclude_collection_ids = (
            [int(cid) for cid in filters.exclude_collections.split(",")] if filters.exclude_collections else []
        )
        include_folders_list = [f.strip() for f in filters.folders.split(",")] if filters.folders else []
        exclude_folders_list = (
            [f.strip() for f in filters.exclude_folders.split(",")] if filters.exclude_folders else []
        )

        # Build query - only select IDs for performance
        query = """
            SELECT DISTINCT f.id
            FROM files f
            JOIN file_locations fl ON f.id = fl.file_id AND fl.is_primary = 1
            WHERE f.indexed = 1
        """
        params = []

        # Apply all filters (same logic as list_files)
        if include_tag_ids:
            for tag_id in include_tag_ids:
                query += " AND EXISTS (SELECT 1 FROM file_tags ft WHERE ft.file_id = f.id AND ft.tag_id = ?)"
                params.append(tag_id)

        if exclude_tag_ids:
            placeholders = ",".join("?" * len(exclude_tag_ids))
            query += f" AND NOT EXISTS (SELECT 1 FROM file_tags ft WHERE ft.file_id = f.id AND ft.tag_id IN ({placeholders}))"
            params.extend(exclude_tag_ids)

        if include_collection_ids:
            placeholders = ",".join("?" * len(include_collection_ids))
            query += f" AND EXISTS (SELECT 1 FROM collection_items ci WHERE ci.file_id = f.id AND ci.collection_id IN ({placeholders}))"
            params.extend(include_collection_ids)

        if exclude_collection_ids:
            placeholders = ",".join("?" * len(exclude_collection_ids))
            query += f" AND NOT EXISTS (SELECT 1 FROM collection_items ci WHERE ci.file_id = f.id AND ci.collection_id IN ({placeholders}))"
            params.extend(exclude_collection_ids)

        if include_folders_list:
            folder_conditions = " OR ".join(["fl.file_path LIKE ?" for _ in include_folders_list])
            query += f" AND ({folder_conditions})"
            params.extend([f"{folder.rstrip('/')}/%"  for folder in include_folders_list])

        if exclude_folders_list:
            for folder in exclude_folders_list:
                query += " AND fl.file_path NOT LIKE ?"
                params.append(f"{folder.rstrip('/')}/%")

        if filters.search:
            query += " AND (fl.file_name LIKE ? OR fl.file_path LIKE ?)"
            search_pattern = f"%{filters.search}%"
            params.extend([search_pattern, search_pattern])

        # Get total count first
        count_query = query.replace("SELECT DISTINCT f.id", "SELECT COUNT(DISTINCT f.id) as total")
        total = conn.execute(count_query, params).fetchone()["total"]

        # Limit results for performance
        query += f" LIMIT {MAX_SELECT_ALL}"
        cursor = conn.execute(query, params)
        sample_ids = [row["id"] for row in cursor.fetchall()]

        return {
            "sample_ids": sample_ids,
            "total": total,
            "limit_reached": total > MAX_SELECT_ALL,
        }


class BulkTagStatesRequest(BaseModel):
    sample_ids: list[int]


@router.post("/bulk-tag-states")
async def get_bulk_tag_states(request: Request, req: BulkTagStatesRequest):
    """Get aggregated tag states for a set of samples (for TagPopup with non-visible samples)"""
    if not req.sample_ids:
        return {"tags": []}

    with get_db_connection(request) as conn:
        # Get all tags with counts of how many samples in the selection have each tag
        placeholders = ",".join("?" * len(req.sample_ids))
        query = f"""
            SELECT
                t.id,
                t.name,
                t.color,
                COUNT(DISTINCT ft.file_id) as sample_count
            FROM tags t
            LEFT JOIN file_tags ft ON t.id = ft.tag_id AND ft.file_id IN ({placeholders})
            GROUP BY t.id, t.name, t.color
            ORDER BY t.name
        """

        cursor = conn.execute(query, req.sample_ids)
        tags = []
        total_samples = len(req.sample_ids)

        for row in cursor.fetchall():
            tag_dict = dict(row)
            count = tag_dict["sample_count"]

            # Determine state
            if count == total_samples:
                state = "all"
            elif count > 0:
                state = "some"
            else:
                state = "none"

            tags.append(
                {
                    "id": tag_dict["id"],
                    "name": tag_dict["name"],
                    "color": tag_dict["color"],
                    "state": state,
                    "count": count,
                }
            )

        return {"tags": tags}


@router.get("/{file_id}/locations")
async def get_file_locations(request: Request, file_id: int):
    """Get all locations for a file (including duplicates)"""
    with get_db_connection(request) as conn:
        # Check if file exists
        file_exists = conn.execute("SELECT 1 FROM files WHERE id = ?", (file_id,)).fetchone()
        if not file_exists:
            raise HTTPException(status_code=404, detail="File not found")

        # Get all locations for this file
        locations = conn.execute(
            """
            SELECT id, file_path, file_name, discovered_at, last_verified, is_primary
            FROM file_locations
            WHERE file_id = ?
            ORDER BY is_primary DESC, discovered_at ASC
            """,
            (file_id,),
        ).fetchall()

        return {
            "file_id": file_id,
            "locations": [dict(loc) for loc in locations],
            "has_duplicates": len(locations) > 1,
        }


class SetPrimaryRequest(BaseModel):
    location_id: int


@router.put("/{file_id}/locations/primary")
async def set_primary_location(request: Request, file_id: int, req: SetPrimaryRequest):
    """Set a specific location as the primary location for a file"""
    with get_db_connection(request) as conn:
        # Check if location exists and belongs to this file
        location = conn.execute(
            "SELECT id FROM file_locations WHERE id = ? AND file_id = ?",
            (req.location_id, file_id),
        ).fetchone()

        if not location:
            raise HTTPException(status_code=404, detail="Location not found or doesn't belong to this file")

        # Unset all other locations as primary for this file
        conn.execute("UPDATE file_locations SET is_primary = 0 WHERE file_id = ?", (file_id,))

        # Set the specified location as primary
        conn.execute("UPDATE file_locations SET is_primary = 1 WHERE id = ?", (req.location_id,))

        conn.commit()

        return {"status": "updated", "file_id": file_id, "primary_location_id": req.location_id}


@router.delete("/{file_id}/locations/{location_id}")
async def delete_file_location(request: Request, file_id: int, location_id: int):
    """Remove a specific location from a file (if file has multiple locations)"""
    with get_db_connection(request) as conn:
        # Check how many locations this file has
        location_count = conn.execute(
            "SELECT COUNT(*) as count FROM file_locations WHERE file_id = ?", (file_id,)
        ).fetchone()["count"]

        if location_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete the only location. Delete the entire file instead.",
            )

        # Check if location exists and belongs to this file
        location = conn.execute(
            "SELECT is_primary FROM file_locations WHERE id = ? AND file_id = ?",
            (location_id, file_id),
        ).fetchone()

        if not location:
            raise HTTPException(status_code=404, detail="Location not found or doesn't belong to this file")

        was_primary = location["is_primary"]

        # Delete the location
        conn.execute("DELETE FROM file_locations WHERE id = ?", (location_id,))

        # If we deleted the primary location, make another one primary
        if was_primary:
            # Set the oldest remaining location as primary
            conn.execute(
                """
                UPDATE file_locations
                SET is_primary = 1
                WHERE file_id = ?
                ORDER BY discovered_at ASC
                LIMIT 1
                """,
                (file_id,),
            )

        conn.commit()

        return {"status": "deleted", "file_id": file_id, "location_id": location_id}
