"""Tag management API endpoints"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.database import db

router = APIRouter()


class Tag(BaseModel):
    id: Optional[int] = None
    name: str
    color: Optional[str] = None
    auto_generated: bool = False


class AddTagsRequest(BaseModel):
    tag_ids: List[int]
    confidence: float = 1.0


@router.get("")
async def list_tags():
    """List all tags"""
    with db.get_connection() as conn:
        cursor = conn.execute(
            "SELECT * FROM tags ORDER BY name"
        )
        tags = [dict(row) for row in cursor.fetchall()]
        return {"tags": tags}


@router.post("")
async def create_tag(tag: Tag):
    """Create a new tag"""
    with db.get_connection() as conn:
        try:
            cursor = conn.execute(
                "INSERT INTO tags (name, color, auto_generated) VALUES (?, ?, ?)",
                (tag.name, tag.color, tag.auto_generated)
            )
            conn.commit()
            return {"id": cursor.lastrowid, **tag.dict()}
        except Exception as e:
            if "UNIQUE constraint failed" in str(e):
                raise HTTPException(status_code=400, detail="Tag already exists")
            raise HTTPException(status_code=500, detail=str(e))


@router.put("/{tag_id}")
async def update_tag(tag_id: int, tag: Tag):
    """Update tag"""
    with db.get_connection() as conn:
        cursor = conn.execute(
            "UPDATE tags SET name = ?, color = ? WHERE id = ?",
            (tag.name, tag.color, tag_id)
        )
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tag not found")

        return {"id": tag_id, **tag.dict()}


@router.delete("/{tag_id}")
async def delete_tag(tag_id: int):
    """Delete tag"""
    with db.get_connection() as conn:
        cursor = conn.execute("DELETE FROM tags WHERE id = ?", (tag_id,))
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tag not found")

        return {"status": "deleted", "id": tag_id}


@router.post("/samples/{sample_id}/tags")
async def add_tags_to_sample(sample_id: int, request: AddTagsRequest):
    """Add tags to a sample"""
    with db.get_connection() as conn:
        # Verify sample exists
        sample = conn.execute("SELECT id FROM samples WHERE id = ?", (sample_id,)).fetchone()
        if not sample:
            raise HTTPException(status_code=404, detail="Sample not found")

        # Add tags
        for tag_id in request.tag_ids:
            try:
                conn.execute(
                    "INSERT OR IGNORE INTO sample_tags (sample_id, tag_id, confidence) VALUES (?, ?, ?)",
                    (sample_id, tag_id, request.confidence)
                )
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Error adding tag {tag_id}: {str(e)}")

        conn.commit()
        return {"status": "tags added", "sample_id": sample_id, "tag_ids": request.tag_ids}


@router.delete("/samples/{sample_id}/tags/{tag_id}")
async def remove_tag_from_sample(sample_id: int, tag_id: int):
    """Remove tag from sample"""
    with db.get_connection() as conn:
        cursor = conn.execute(
            "DELETE FROM sample_tags WHERE sample_id = ? AND tag_id = ?",
            (sample_id, tag_id)
        )
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tag assignment not found")

        return {"status": "tag removed", "sample_id": sample_id, "tag_id": tag_id}
