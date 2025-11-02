"""Collection management API endpoints"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.db_connection import db, get_db_connection

router = APIRouter()


class Collection(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None


class AddItemRequest(BaseModel):
    sample_id: int
    alias: Optional[str] = None


class BulkUpdateCollectionsRequest(BaseModel):
    sample_ids: List[int]
    add_collection_ids: List[int]  # Collections to add samples to
    remove_collection_ids: List[int]  # Collections to remove samples from


class ReorderRequest(BaseModel):
    item_order: List[int]  # List of sample IDs in desired order


@router.get("")
async def list_collections(request: Request):
    """List all collections"""
    with get_db_connection(request) as conn:
        cursor = conn.execute("SELECT * FROM collections ORDER BY updated_at DESC")
        collections = [dict(row) for row in cursor.fetchall()]
        return {"collections": collections}


@router.post("")
async def create_collection(request: Request, collection: Collection):
    """Create a new collection"""
    with get_db_connection(request) as conn:
        cursor = conn.execute(
            "INSERT INTO collections (name, description) VALUES (?, ?)", (collection.name, collection.description)
        )
        conn.commit()
        return {"id": cursor.lastrowid, **collection.dict()}


@router.get("/{collection_id}")
async def get_collection(request: Request, collection_id: int):
    """Get collection details with samples"""
    with get_db_connection(request) as conn:
        # Get collection
        collection = conn.execute("SELECT * FROM collections WHERE id = ?", (collection_id,)).fetchone()

        if not collection:
            raise HTTPException(status_code=404, detail="Collection not found")

        # Get samples in collection
        samples = conn.execute(
            """
            SELECT s.*, ci.order_index, ci.alias
            FROM samples s
            JOIN collection_items ci ON s.id = ci.sample_id
            WHERE ci.collection_id = ?
            ORDER BY ci.order_index
        """,
            (collection_id,),
        ).fetchall()

        result = dict(collection)
        result["samples"] = [dict(sample) for sample in samples]

        return result


@router.put("/{collection_id}")
async def update_collection(request: Request, collection_id: int, collection: Collection):
    """Update collection"""
    with get_db_connection(request) as conn:
        cursor = conn.execute(
            "UPDATE collections SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (collection.name, collection.description, collection_id),
        )
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Collection not found")

        return {"id": collection_id, **collection.dict()}


@router.delete("/{collection_id}")
async def delete_collection(request: Request, collection_id: int):
    """Delete collection"""
    with get_db_connection(request) as conn:
        cursor = conn.execute("DELETE FROM collections WHERE id = ?", (collection_id,))
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Collection not found")

        return {"status": "deleted", "id": collection_id}


@router.post("/{collection_id}/items")
async def add_item_to_collection(request: Request, collection_id: int, add_request: AddItemRequest):
    """Add sample to collection"""
    with get_db_connection(request) as conn:
        # Verify collection exists
        collection = conn.execute("SELECT id FROM collections WHERE id = ?", (collection_id,)).fetchone()
        if not collection:
            raise HTTPException(status_code=404, detail="Collection not found")

        # Get next order index
        max_order = conn.execute(
            "SELECT MAX(order_index) as max_order FROM collection_items WHERE collection_id = ?", (collection_id,)
        ).fetchone()["max_order"]
        next_order = (max_order or 0) + 1

        # Add item
        try:
            conn.execute(
                "INSERT INTO collection_items (collection_id, sample_id, order_index, alias) VALUES (?, ?, ?, ?)",
                (collection_id, add_request.sample_id, next_order, add_request.alias),
            )
            conn.commit()
            return {
                "status": "added",
                "collection_id": collection_id,
                "sample_id": add_request.sample_id,
                "alias": add_request.alias,
            }
        except Exception as e:
            if "UNIQUE constraint failed" in str(e):
                raise HTTPException(status_code=400, detail="Sample already in collection")
            raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{collection_id}/items/{sample_id}")
async def remove_item_from_collection(request: Request, collection_id: int, sample_id: int):
    """Remove sample from collection"""
    with get_db_connection(request) as conn:
        cursor = conn.execute(
            "DELETE FROM collection_items WHERE collection_id = ? AND sample_id = ?", (collection_id, sample_id)
        )
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Item not found in collection")

        return {"status": "removed", "collection_id": collection_id, "sample_id": sample_id}


@router.put("/{collection_id}/items/reorder")
async def reorder_collection_items(request: Request, collection_id: int, reorder_request: ReorderRequest):
    """Reorder items in collection"""
    with get_db_connection(request) as conn:
        # Update order for each item
        for index, sample_id in enumerate(reorder_request.item_order):
            conn.execute(
                "UPDATE collection_items SET order_index = ? WHERE collection_id = ? AND sample_id = ?",
                (index, collection_id, sample_id),
            )
        conn.commit()

        return {"status": "reordered", "collection_id": collection_id}


@router.post("/bulk")
async def bulk_update_sample_collections(request: Request, bulk_request: BulkUpdateCollectionsRequest):
    """
    Bulk update collections for multiple samples

    For each sample in sample_ids:
    - Collections in add_collection_ids will have the sample added (if not already present)
    - Collections in remove_collection_ids will have the sample removed (if present)
    """
    with get_db_connection(request) as conn:
        # Verify all samples exist
        placeholders = ",".join("?" * len(bulk_request.sample_ids))
        cursor = conn.execute(f"SELECT id FROM samples WHERE id IN ({placeholders})", bulk_request.sample_ids)
        existing_samples = {row["id"] for row in cursor.fetchall()}

        if len(existing_samples) != len(bulk_request.sample_ids):
            missing = set(bulk_request.sample_ids) - existing_samples
            raise HTTPException(status_code=404, detail=f"Samples not found: {missing}")

        added_count = 0
        removed_count = 0

        # Process additions
        for sample_id in bulk_request.sample_ids:
            for collection_id in bulk_request.add_collection_ids:
                # Get next order index for this collection
                max_order = conn.execute(
                    "SELECT MAX(order_index) as max_order FROM collection_items WHERE collection_id = ?",
                    (collection_id,),
                ).fetchone()["max_order"]
                next_order = (max_order or 0) + 1

                try:
                    conn.execute(
                        "INSERT OR IGNORE INTO collection_items (collection_id, sample_id, order_index) VALUES (?, ?, ?)",
                        (collection_id, sample_id, next_order),
                    )
                    if conn.total_changes > 0:
                        added_count += 1
                except Exception as e:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Error adding sample {sample_id} to collection {collection_id}: {str(e)}",
                    )

        # Process removals
        for sample_id in bulk_request.sample_ids:
            for collection_id in bulk_request.remove_collection_ids:
                cursor = conn.execute(
                    "DELETE FROM collection_items WHERE collection_id = ? AND sample_id = ?", (collection_id, sample_id)
                )
                removed_count += cursor.rowcount

        # Update timestamps for affected collections
        all_collection_ids = set(bulk_request.add_collection_ids + bulk_request.remove_collection_ids)
        if all_collection_ids:
            placeholders = ",".join("?" * len(all_collection_ids))
            conn.execute(
                f"UPDATE collections SET updated_at = CURRENT_TIMESTAMP WHERE id IN ({placeholders})",
                list(all_collection_ids),
            )

        conn.commit()

        return {
            "status": "success",
            "samples_updated": len(bulk_request.sample_ids),
            "items_added": added_count,
            "items_removed": removed_count,
            "details": {
                "sample_ids": bulk_request.sample_ids,
                "add_collection_ids": bulk_request.add_collection_ids,
                "remove_collection_ids": bulk_request.remove_collection_ids,
            },
        }
