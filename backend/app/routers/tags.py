"""Tag management API endpoints"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import db

router = APIRouter()


class Tag(BaseModel):
    id: Optional[int] = None
    name: str
    color: Optional[str] = None
    auto_generated: bool = False
    is_system: bool = False


class AddTagsRequest(BaseModel):
    tag_ids: List[int]
    confidence: float = 1.0


class BulkUpdateTagsRequest(BaseModel):
    sample_ids: List[int]
    add_tag_ids: List[int] = []
    remove_tag_ids: List[int] = []


@router.get("")
async def list_tags():
    """List all tags"""
    with db.get_connection() as conn:
        cursor = conn.execute("SELECT * FROM tags ORDER BY name")
        tags = [dict(row) for row in cursor.fetchall()]
        return {"tags": tags}


@router.post("")
async def create_tag(tag: Tag):
    """Create a new tag"""
    with db.get_connection() as conn:
        try:
            cursor = conn.execute(
                "INSERT INTO tags (name, color, auto_generated) VALUES (?, ?, ?)",
                (tag.name, tag.color, tag.auto_generated),
            )
            conn.commit()
            return {"id": cursor.lastrowid, **tag.dict()}
        except Exception as e:
            if "UNIQUE constraint failed" in str(e):
                raise HTTPException(status_code=400, detail="Tag already exists")
            raise HTTPException(status_code=500, detail=str(e))


@router.put("/{tag_id}")
async def update_tag(tag_id: int, tag: Tag):
    """Update tag (system tags can only update color)"""
    with db.get_connection() as conn:
        # Check if tag is a system tag
        existing = conn.execute("SELECT is_system FROM tags WHERE id = ?", (tag_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Tag not found")

        is_system = existing["is_system"]

        if is_system:
            # System tags can only update color, not name
            cursor = conn.execute("UPDATE tags SET color = ? WHERE id = ?", (tag.color, tag_id))
        else:
            cursor = conn.execute("UPDATE tags SET name = ?, color = ? WHERE id = ?", (tag.name, tag.color, tag_id))

        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tag not found")

        return {"id": tag_id, **tag.dict()}


@router.delete("/{tag_id}")
async def delete_tag(tag_id: int):
    """Delete tag (system tags cannot be deleted)"""
    with db.get_connection() as conn:
        # Check if tag is a system tag
        tag = conn.execute("SELECT is_system, name FROM tags WHERE id = ?", (tag_id,)).fetchone()
        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")

        if tag["is_system"]:
            raise HTTPException(status_code=403, detail=f"Cannot delete system tag '{tag['name']}'")

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
                    (sample_id, tag_id, request.confidence),
                )
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Error adding tag {tag_id}: {str(e)}")

        conn.commit()
        return {"status": "tags added", "sample_id": sample_id, "tag_ids": request.tag_ids}


@router.delete("/samples/{sample_id}/tags/{tag_id}")
async def remove_tag_from_sample(sample_id: int, tag_id: int):
    """Remove tag from sample"""
    with db.get_connection() as conn:
        cursor = conn.execute("DELETE FROM sample_tags WHERE sample_id = ? AND tag_id = ?", (sample_id, tag_id))
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tag assignment not found")

        return {"status": "tag removed", "sample_id": sample_id, "tag_id": tag_id}


@router.post("/bulk")
async def bulk_update_sample_tags(request: BulkUpdateTagsRequest):
    """
    Bulk update tags for multiple samples

    Cleanly identifies which tags to add to which samples and which tags to remove from which samples.
    For each sample in sample_ids:
    - Tags in add_tag_ids will be added (if not already present)
    - Tags in remove_tag_ids will be removed (if present)
    """
    with db.get_connection() as conn:
        # Verify all samples exist
        placeholders = ",".join("?" * len(request.sample_ids))
        cursor = conn.execute(f"SELECT id FROM samples WHERE id IN ({placeholders})", request.sample_ids)
        existing_samples = {row["id"] for row in cursor.fetchall()}

        if len(existing_samples) != len(request.sample_ids):
            missing = set(request.sample_ids) - existing_samples
            raise HTTPException(status_code=404, detail=f"Samples not found: {missing}")

        # Process tag additions
        added_count = 0
        for sample_id in request.sample_ids:
            for tag_id in request.add_tag_ids:
                try:
                    conn.execute(
                        "INSERT OR IGNORE INTO sample_tags (sample_id, tag_id, confidence) VALUES (?, ?, ?)",
                        (sample_id, tag_id, 1.0),
                    )
                    if conn.total_changes > 0:
                        added_count += 1
                except Exception as e:
                    raise HTTPException(
                        status_code=400, detail=f"Error adding tag {tag_id} to sample {sample_id}: {str(e)}"
                    )

        # Process tag removals
        removed_count = 0
        for sample_id in request.sample_ids:
            for tag_id in request.remove_tag_ids:
                cursor = conn.execute("DELETE FROM sample_tags WHERE sample_id = ? AND tag_id = ?", (sample_id, tag_id))
                removed_count += cursor.rowcount

        conn.commit()

        return {
            "status": "success",
            "samples_updated": len(request.sample_ids),
            "tags_added": added_count,
            "tags_removed": removed_count,
            "details": {
                "sample_ids": request.sample_ids,
                "add_tag_ids": request.add_tag_ids,
                "remove_tag_ids": request.remove_tag_ids,
            },
        }
