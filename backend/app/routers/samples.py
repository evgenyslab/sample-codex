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
async def list_samples(page: int = 1, limit: int = ITEMS_PER_PAGE, folder_id: Optional[int] = None):
    """List samples with pagination and optional filtering"""
    offset = (page - 1) * limit

    with db.get_connection() as conn:
        # Build query
        query = "SELECT * FROM samples WHERE indexed = 1"
        params = []

        if folder_id:
            # Get folder path and filter
            folder = conn.execute("SELECT path FROM folders WHERE id = ?", (folder_id,)).fetchone()
            if folder:
                query += " AND filepath LIKE ?"
                params.append(f"{folder['path']}%")

        query += " ORDER BY filename LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor = conn.execute(query, params)
        samples = [dict(row) for row in cursor.fetchall()]

        # Get total count
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
    """Stream audio file"""
    with db.get_connection() as conn:
        sample = conn.execute("SELECT filepath FROM samples WHERE id = ?", (sample_id,)).fetchone()

        if not sample:
            raise HTTPException(status_code=404, detail="Sample not found")

        filepath = Path(sample["filepath"])
        if not filepath.exists():
            raise HTTPException(status_code=404, detail="Audio file not found on disk")

        return FileResponse(filepath, media_type="audio/*", filename=filepath.name)


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
