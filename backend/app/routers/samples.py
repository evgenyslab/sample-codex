"""Sample management API endpoints"""

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.config import ITEMS_PER_PAGE
from app.database import db

router = APIRouter()


class Sample(BaseModel):
    id: int
    filepath: str
    filename: str
    file_size: Optional[int]
    duration: Optional[float]
    sample_rate: Optional[int]
    format: Optional[str]
    channels: Optional[int]


class SampleUpdate(BaseModel):
    filename: Optional[str] = None


@router.get("")
async def list_samples(
    page: int = 1,
    limit: int = ITEMS_PER_PAGE,
    folder_id: Optional[int] = None,
    tags: Optional[str] = None,
    exclude_tags: Optional[str] = None
):
    """List samples with pagination and optional filtering by folder and tags"""
    offset = (page - 1) * limit

    with db.get_connection() as conn:
        # Parse tag IDs
        include_tag_ids = [int(tid) for tid in tags.split(',')] if tags else []
        exclude_tag_ids = [int(tid) for tid in exclude_tags.split(',')] if exclude_tags else []

        # Build query
        if include_tag_ids or exclude_tag_ids:
            # Use subquery to filter by tags
            query = "SELECT s.* FROM samples s WHERE s.indexed = 1"
            params = []

            # Include tags filter (sample must have ALL included tags)
            if include_tag_ids:
                for tag_id in include_tag_ids:
                    query += f" AND EXISTS (SELECT 1 FROM sample_tags st WHERE st.sample_id = s.id AND st.tag_id = ?)"
                    params.append(tag_id)

            # Exclude tags filter (sample must NOT have ANY excluded tags)
            if exclude_tag_ids:
                placeholders = ','.join('?' * len(exclude_tag_ids))
                query += f" AND NOT EXISTS (SELECT 1 FROM sample_tags st WHERE st.sample_id = s.id AND st.tag_id IN ({placeholders}))"
                params.extend(exclude_tag_ids)

            if folder_id:
                folder = conn.execute("SELECT path FROM folders WHERE id = ?", (folder_id,)).fetchone()
                if folder:
                    query += " AND s.filepath LIKE ?"
                    params.append(f"{folder['path']}%")

            query += " ORDER BY s.filename LIMIT ? OFFSET ?"
            params.extend([limit, offset])
        else:
            # No tag filtering - simpler query
            query = "SELECT * FROM samples WHERE indexed = 1"
            params = []

            if folder_id:
                folder = conn.execute("SELECT path FROM folders WHERE id = ?", (folder_id,)).fetchone()
                if folder:
                    query += " AND filepath LIKE ?"
                    params.append(f"{folder['path']}%")

            query += " ORDER BY filename LIMIT ? OFFSET ?"
            params.extend([limit, offset])

        cursor = conn.execute(query, params)
        samples = [dict(row) for row in cursor.fetchall()]

        # Get tags for each sample
        for sample in samples:
            tags_cursor = conn.execute(
                """
                SELECT t.id, t.name, t.color, st.confidence
                FROM tags t
                JOIN sample_tags st ON t.id = st.tag_id
                WHERE st.sample_id = ?
                ORDER BY t.name
                """,
                (sample['id'],)
            )
            sample['tags'] = [dict(row) for row in tags_cursor.fetchall()]

        # Get total count with same filters
        if include_tag_ids or exclude_tag_ids:
            count_query = "SELECT COUNT(*) as total FROM samples s WHERE s.indexed = 1"
            count_params = []

            if include_tag_ids:
                for tag_id in include_tag_ids:
                    count_query += f" AND EXISTS (SELECT 1 FROM sample_tags st WHERE st.sample_id = s.id AND st.tag_id = ?)"
                    count_params.append(tag_id)

            if exclude_tag_ids:
                placeholders = ','.join('?' * len(exclude_tag_ids))
                count_query += f" AND NOT EXISTS (SELECT 1 FROM sample_tags st WHERE st.sample_id = s.id AND st.tag_id IN ({placeholders}))"
                count_params.extend(exclude_tag_ids)

            if folder_id:
                folder = conn.execute("SELECT path FROM folders WHERE id = ?", (folder_id,)).fetchone()
                if folder:
                    count_query += " AND s.filepath LIKE ?"
                    count_params.append(f"{folder['path']}%")
        else:
            count_query = "SELECT COUNT(*) as total FROM samples WHERE indexed = 1"
            count_params = []
            if folder_id:
                folder = conn.execute("SELECT path FROM folders WHERE id = ?", (folder_id,)).fetchone()
                if folder:
                    count_query += " AND filepath LIKE ?"
                    count_params.append(f"{folder['path']}%")

        total = conn.execute(count_query, count_params).fetchone()["total"]

        return {
            "samples": samples,
            "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit},
        }


@router.get("/{sample_id}")
async def get_sample(sample_id: int):
    """Get sample details including tags"""
    with db.get_connection() as conn:
        # Get sample
        sample = conn.execute("SELECT * FROM samples WHERE id = ?", (sample_id,)).fetchone()

        if not sample:
            raise HTTPException(status_code=404, detail="Sample not found")

        # Get tags
        tags = conn.execute(
            """
            SELECT t.id, t.name, t.color, st.confidence
            FROM tags t
            JOIN sample_tags st ON t.id = st.tag_id
            WHERE st.sample_id = ?
        """,
            (sample_id,),
        ).fetchall()

        result = dict(sample)
        result["tags"] = [dict(tag) for tag in tags]

        return result


@router.get("/{sample_id}/audio")
async def stream_audio(sample_id: int):
    """Stream audio file for playback"""
    with db.get_connection() as conn:
        sample = conn.execute("SELECT filepath, format FROM samples WHERE id = ?", (sample_id,)).fetchone()

        if not sample:
            raise HTTPException(status_code=404, detail="Sample not found")

        filepath = Path(sample["filepath"])
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
        media_type = format_to_mime.get(sample["format"], "audio/*")

        return FileResponse(
            filepath,
            media_type=media_type,
            filename=filepath.name,
            headers={"Accept-Ranges": "bytes"},
        )


@router.put("/{sample_id}")
async def update_sample(sample_id: int, update: SampleUpdate):
    """Update sample metadata"""
    with db.get_connection() as conn:
        fields = []
        params = []

        if update.filename:
            fields.append("filename = ?")
            params.append(update.filename)

        if not fields:
            return {"status": "no changes"}

        params.append(sample_id)
        query = f"UPDATE samples SET {', '.join(fields)} WHERE id = ?"

        cursor = conn.execute(query, params)
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Sample not found")

        return {"status": "updated", "id": sample_id}


@router.delete("/{sample_id}")
async def delete_sample(sample_id: int):
    """Delete sample record"""
    with db.get_connection() as conn:
        cursor = conn.execute("DELETE FROM samples WHERE id = ?", (sample_id,))
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Sample not found")

        return {"status": "deleted", "id": sample_id}
