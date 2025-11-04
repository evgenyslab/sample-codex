"""Collection management API endpoints"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.db_connection import get_db_connection

router = APIRouter()


class Collection(BaseModel):
    id: int | None = None
    name: str
    description: str | None = None


class AddItemRequest(BaseModel):
    file_id: int


class BulkUpdateCollectionsRequest(BaseModel):
    file_ids: list[int]
    add_collection_ids: list[int]  # Collections to add files to
    remove_collection_ids: list[int]  # Collections to remove files from


class ReorderRequest(BaseModel):
    item_order: list[int]  # list of file IDs in desired order


@router.get("")
async def list_collections(request: Request):
    """list all collections"""
    with get_db_connection(request) as conn:
        cursor = conn.execute("SELECT * FROM collections ORDER BY updated_at DESC")
        collections = [dict(row) for row in cursor.fetchall()]
        return {"collections": collections}


@router.get("/metadata")
async def get_collections_metadata(request: Request):
    """List all collections with sample counts"""
    with get_db_connection(request) as conn:
        query = """
            SELECT
                c.id,
                c.name,
                c.description,
                c.updated_at,
                COUNT(DISTINCT ci.file_id) as sample_count
            FROM collections c
            LEFT JOIN collection_items ci ON c.id = ci.collection_id
            LEFT JOIN files f ON ci.file_id = f.id AND f.indexed = 1
            GROUP BY c.id, c.name, c.description, c.updated_at
            ORDER BY c.updated_at DESC
        """
        cursor = conn.execute(query)
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
    """Get collection details with files"""
    with get_db_connection(request) as conn:
        # Get collection
        collection = conn.execute("SELECT * FROM collections WHERE id = ?", (collection_id,)).fetchone()

        if not collection:
            raise HTTPException(status_code=404, detail="Collection not found")

        # Get files in collection
        files = conn.execute(
            """
            SELECT f.*, ci.order_index
            FROM files f
            JOIN collection_items ci ON f.id = ci.file_id
            WHERE ci.collection_id = ?
            ORDER BY ci.order_index
        """,
            (collection_id,),
        ).fetchall()

        result = dict(collection)
        result["files"] = [dict(file) for file in files]

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
    """Add file to collection"""
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
                "INSERT INTO collection_items (collection_id, file_id, order_index) VALUES (?, ?, ?)",
                (collection_id, add_request.file_id, next_order),
            )
            conn.commit()
            return {
                "status": "added",
                "collection_id": collection_id,
                "file_id": add_request.file_id,
            }
        except Exception as e:
            if "UNIQUE constraint failed" in str(e):
                raise HTTPException(status_code=400, detail="File already in collection") from e
            raise HTTPException(status_code=500, detail=str(e)) from e


@router.delete("/{collection_id}/items/{file_id}")
async def remove_item_from_collection(request: Request, collection_id: int, file_id: int):
    """Remove file from collection"""
    with get_db_connection(request) as conn:
        cursor = conn.execute(
            "DELETE FROM collection_items WHERE collection_id = ? AND file_id = ?", (collection_id, file_id)
        )
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Item not found in collection")

        return {"status": "removed", "collection_id": collection_id, "file_id": file_id}


@router.put("/{collection_id}/items/reorder")
async def reorder_collection_items(request: Request, collection_id: int, reorder_request: ReorderRequest):
    """Reorder items in collection"""
    with get_db_connection(request) as conn:
        # Update order for each item
        for index, file_id in enumerate(reorder_request.item_order):
            conn.execute(
                "UPDATE collection_items SET order_index = ? WHERE collection_id = ? AND file_id = ?",
                (index, collection_id, file_id),
            )
        conn.commit()

        return {"status": "reordered", "collection_id": collection_id}


@router.post("/bulk")
async def bulk_update_file_collections(request: Request, bulk_request: BulkUpdateCollectionsRequest):
    """
    Bulk update collections for multiple files

    For each file in file_ids:
    - Collections in add_collection_ids will have the file added (if not already present)
    - Collections in remove_collection_ids will have the file removed (if present)
    """
    with get_db_connection(request) as conn:
        # Verify all files exist
        placeholders = ",".join("?" * len(bulk_request.file_ids))
        cursor = conn.execute(f"SELECT id FROM files WHERE id IN ({placeholders})", bulk_request.file_ids)
        existing_files = {row["id"] for row in cursor.fetchall()}

        if len(existing_files) != len(bulk_request.file_ids):
            missing = set(bulk_request.file_ids) - existing_files
            raise HTTPException(status_code=404, detail=f"Files not found: {missing}")

        added_count = 0
        removed_count = 0

        # Process additions
        for file_id in bulk_request.file_ids:
            for collection_id in bulk_request.add_collection_ids:
                # Get next order index for this collection
                max_order = conn.execute(
                    "SELECT MAX(order_index) as max_order FROM collection_items WHERE collection_id = ?",
                    (collection_id,),
                ).fetchone()["max_order"]
                next_order = (max_order or 0) + 1

                try:
                    conn.execute(
                        "INSERT OR IGNORE INTO collection_items (collection_id, file_id, order_index) VALUES (?, ?, ?)",
                        (collection_id, file_id, next_order),
                    )
                    if conn.total_changes > 0:
                        added_count += 1
                except Exception as e:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Error adding file {file_id} to collection {collection_id}: {str(e)}",
                    ) from e

        # Process removals
        for file_id in bulk_request.file_ids:
            for collection_id in bulk_request.remove_collection_ids:
                cursor = conn.execute(
                    "DELETE FROM collection_items WHERE collection_id = ? AND file_id = ?", (collection_id, file_id)
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
            "files_updated": len(bulk_request.file_ids),
            "items_added": added_count,
            "items_removed": removed_count,
            "details": {
                "file_ids": bulk_request.file_ids,
                "add_collection_ids": bulk_request.add_collection_ids,
                "remove_collection_ids": bulk_request.remove_collection_ids,
            },
        }
