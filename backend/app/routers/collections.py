"""Collection management API endpoints"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.database import db

router = APIRouter()


class Collection(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None


class AddItemRequest(BaseModel):
    sample_id: int


class ReorderRequest(BaseModel):
    item_order: List[int]  # List of sample IDs in desired order


@router.get("")
async def list_collections():
    """List all collections"""
    with db.get_connection() as conn:
        cursor = conn.execute(
            "SELECT * FROM collections ORDER BY updated_at DESC"
        )
        collections = [dict(row) for row in cursor.fetchall()]
        return {"collections": collections}


@router.post("")
async def create_collection(collection: Collection):
    """Create a new collection"""
    with db.get_connection() as conn:
        cursor = conn.execute(
            "INSERT INTO collections (name, description) VALUES (?, ?)",
            (collection.name, collection.description)
        )
        conn.commit()
        return {"id": cursor.lastrowid, **collection.dict()}


@router.get("/{collection_id}")
async def get_collection(collection_id: int):
    """Get collection details with samples"""
    with db.get_connection() as conn:
        # Get collection
        collection = conn.execute(
            "SELECT * FROM collections WHERE id = ?", (collection_id,)
        ).fetchone()

        if not collection:
            raise HTTPException(status_code=404, detail="Collection not found")

        # Get samples in collection
        samples = conn.execute("""
            SELECT s.*, ci.order_index
            FROM samples s
            JOIN collection_items ci ON s.id = ci.sample_id
            WHERE ci.collection_id = ?
            ORDER BY ci.order_index
        """, (collection_id,)).fetchall()

        result = dict(collection)
        result["samples"] = [dict(sample) for sample in samples]

        return result


@router.put("/{collection_id}")
async def update_collection(collection_id: int, collection: Collection):
    """Update collection"""
    with db.get_connection() as conn:
        cursor = conn.execute(
            "UPDATE collections SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (collection.name, collection.description, collection_id)
        )
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Collection not found")

        return {"id": collection_id, **collection.dict()}


@router.delete("/{collection_id}")
async def delete_collection(collection_id: int):
    """Delete collection"""
    with db.get_connection() as conn:
        cursor = conn.execute("DELETE FROM collections WHERE id = ?", (collection_id,))
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Collection not found")

        return {"status": "deleted", "id": collection_id}


@router.post("/{collection_id}/items")
async def add_item_to_collection(collection_id: int, request: AddItemRequest):
    """Add sample to collection"""
    with db.get_connection() as conn:
        # Verify collection exists
        collection = conn.execute(
            "SELECT id FROM collections WHERE id = ?", (collection_id,)
        ).fetchone()
        if not collection:
            raise HTTPException(status_code=404, detail="Collection not found")

        # Get next order index
        max_order = conn.execute(
            "SELECT MAX(order_index) as max_order FROM collection_items WHERE collection_id = ?",
            (collection_id,)
        ).fetchone()["max_order"]
        next_order = (max_order or 0) + 1

        # Add item
        try:
            conn.execute(
                "INSERT INTO collection_items (collection_id, sample_id, order_index) VALUES (?, ?, ?)",
                (collection_id, request.sample_id, next_order)
            )
            conn.commit()
            return {"status": "added", "collection_id": collection_id, "sample_id": request.sample_id}
        except Exception as e:
            if "UNIQUE constraint failed" in str(e):
                raise HTTPException(status_code=400, detail="Sample already in collection")
            raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{collection_id}/items/{sample_id}")
async def remove_item_from_collection(collection_id: int, sample_id: int):
    """Remove sample from collection"""
    with db.get_connection() as conn:
        cursor = conn.execute(
            "DELETE FROM collection_items WHERE collection_id = ? AND sample_id = ?",
            (collection_id, sample_id)
        )
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Item not found in collection")

        return {"status": "removed", "collection_id": collection_id, "sample_id": sample_id}


@router.put("/{collection_id}/items/reorder")
async def reorder_collection_items(collection_id: int, request: ReorderRequest):
    """Reorder items in collection"""
    with db.get_connection() as conn:
        # Update order for each item
        for index, sample_id in enumerate(request.item_order):
            conn.execute(
                "UPDATE collection_items SET order_index = ? WHERE collection_id = ? AND sample_id = ?",
                (index, collection_id, sample_id)
            )
        conn.commit()

        return {"status": "reordered", "collection_id": collection_id}
