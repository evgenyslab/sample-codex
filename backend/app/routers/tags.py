"""Tag management API endpoints"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.db_connection import get_db_connection

router = APIRouter()


class Tag(BaseModel):
    id: int | None = None
    name: str
    color: str | None = None
    auto_generated: bool = False
    is_system: bool = False


class AddTagsRequest(BaseModel):
    tag_ids: list[int]
    confidence: float = 1.0


class BulkUpdateTagsRequest(BaseModel):
    file_ids: list[int]
    add_tag_ids: list[int] = []
    remove_tag_ids: list[int] = []


@router.get("")
async def list_tags(request: Request):
    """List all tags"""
    with get_db_connection(request) as conn:
        cursor = conn.execute("SELECT * FROM tags ORDER BY name")
        tags = [dict(row) for row in cursor.fetchall()]
        return {"tags": tags}


@router.post("")
async def create_tag(request: Request, tag: Tag):
    """Create a new tag"""
    with get_db_connection(request) as conn:
        try:
            cursor = conn.execute(
                "INSERT INTO tags (name, color, auto_generated) VALUES (?, ?, ?)",
                (tag.name, tag.color, tag.auto_generated),
            )
            conn.commit()
            return {"id": cursor.lastrowid, **tag.dict()}
        except Exception as e:
            if "UNIQUE constraint failed" in str(e):
                raise HTTPException(status_code=400, detail="Tag already exists") from e
            raise HTTPException(status_code=500, detail=str(e)) from e


@router.put("/{tag_id}")
async def update_tag(request: Request, tag_id: int, tag: Tag):
    """Update tag (system tags can only update color)"""
    with get_db_connection(request) as conn:
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
async def delete_tag(request: Request, tag_id: int):
    """Delete tag (system tags cannot be deleted)"""
    with get_db_connection(request) as conn:
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


@router.post("/files/{file_id}/tags")
async def add_tags_to_file(request: Request, file_id: int, add_request: AddTagsRequest):
    """Add tags to a file"""
    with get_db_connection(request) as conn:
        # Verify file exists
        file = conn.execute("SELECT id FROM files WHERE id = ?", (file_id,)).fetchone()
        if not file:
            raise HTTPException(status_code=404, detail="File not found")

        # Add tags
        for tag_id in add_request.tag_ids:
            try:
                conn.execute(
                    "INSERT OR IGNORE INTO file_tags (file_id, tag_id, confidence) VALUES (?, ?, ?)",
                    (file_id, tag_id, add_request.confidence),
                )
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Error adding tag {tag_id}: {str(e)}") from e

        conn.commit()
        return {"status": "tags added", "file_id": file_id, "tag_ids": add_request.tag_ids}


@router.delete("/files/{file_id}/tags/{tag_id}")
async def remove_tag_from_file(request: Request, file_id: int, tag_id: int):
    """Remove tag from file"""
    with get_db_connection(request) as conn:
        cursor = conn.execute("DELETE FROM file_tags WHERE file_id = ? AND tag_id = ?", (file_id, tag_id))
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tag assignment not found")

        return {"status": "tag removed", "file_id": file_id, "tag_id": tag_id}


@router.post("/bulk")
async def bulk_update_file_tags(request: Request, bulk_request: BulkUpdateTagsRequest):
    """
    Bulk update tags for multiple files

    Cleanly identifies which tags to add to which files and which tags to remove from which files.
    For each file in file_ids:
    - Tags in add_tag_ids will be added (if not already present)
    - Tags in remove_tag_ids will be removed (if present)
    """
    with get_db_connection(request) as conn:
        # Verify all files exist
        placeholders = ",".join("?" * len(bulk_request.file_ids))
        cursor = conn.execute(f"SELECT id FROM files WHERE id IN ({placeholders})", bulk_request.file_ids)
        existing_files = {row["id"] for row in cursor.fetchall()}

        if len(existing_files) != len(bulk_request.file_ids):
            missing = set(bulk_request.file_ids) - existing_files
            raise HTTPException(status_code=404, detail=f"Files not found: {missing}")

        # Process tag additions
        added_count = 0
        for file_id in bulk_request.file_ids:
            for tag_id in bulk_request.add_tag_ids:
                try:
                    conn.execute(
                        "INSERT OR IGNORE INTO file_tags (file_id, tag_id, confidence) VALUES (?, ?, ?)",
                        (file_id, tag_id, 1.0),
                    )
                    if conn.total_changes > 0:
                        added_count += 1
                except Exception as e:
                    raise HTTPException(
                        status_code=400, detail=f"Error adding tag {tag_id} to file {file_id}: {str(e)}"
                    ) from e

        # Process tag removals
        removed_count = 0
        for file_id in bulk_request.file_ids:
            for tag_id in bulk_request.remove_tag_ids:
                cursor = conn.execute("DELETE FROM file_tags WHERE file_id = ? AND tag_id = ?", (file_id, tag_id))
                removed_count += cursor.rowcount

        conn.commit()

        return {
            "status": "success",
            "files_updated": len(bulk_request.file_ids),
            "tags_added": added_count,
            "tags_removed": removed_count,
            "details": {
                "file_ids": bulk_request.file_ids,
                "add_tag_ids": bulk_request.add_tag_ids,
                "remove_tag_ids": bulk_request.remove_tag_ids,
            },
        }
