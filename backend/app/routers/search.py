"""Search API endpoints"""

from typing import Optional

from fastapi import APIRouter, Request

from app.config import ITEMS_PER_PAGE
from app.db_connection import db, get_db_connection

router = APIRouter()


@router.get("")
async def search_samples(
    request: Request,
    q: Optional[str] = None,
    tags: Optional[str] = None,  # Comma-separated tag IDs
    mode: str = "and",  # 'and' or 'or' for tag filtering
    page: int = 1,
    limit: int = ITEMS_PER_PAGE,
):
    """Search samples by text and/or tags"""
    offset = (page - 1) * limit

    with get_db_connection(request) as conn:
        # Build base query
        if q and tags:
            # Full-text search + tag filtering
            tag_ids = [int(t) for t in tags.split(",")]

            if mode == "and":
                # Sample must have ALL specified tags
                query = """
                    SELECT DISTINCT s.*
                    FROM samples s
                    JOIN samples_fts fts ON s.id = fts.rowid
                    WHERE fts MATCH ?
                    AND s.id IN (
                        SELECT sample_id
                        FROM sample_tags
                        WHERE tag_id IN ({})
                        GROUP BY sample_id
                        HAVING COUNT(DISTINCT tag_id) = ?
                    )
                    ORDER BY s.filename
                    LIMIT ? OFFSET ?
                """.format(",".join("?" * len(tag_ids)))
                params = [q] + tag_ids + [len(tag_ids), limit, offset]
            else:
                # Sample must have ANY of the specified tags
                query = """
                    SELECT DISTINCT s.*
                    FROM samples s
                    JOIN samples_fts fts ON s.id = fts.rowid
                    JOIN sample_tags st ON s.id = st.sample_id
                    WHERE fts MATCH ?
                    AND st.tag_id IN ({})
                    ORDER BY s.filename
                    LIMIT ? OFFSET ?
                """.format(",".join("?" * len(tag_ids)))
                params = [q] + tag_ids + [limit, offset]

        elif q:
            # Text search only
            query = """
                SELECT s.*
                FROM samples s
                JOIN samples_fts fts ON s.id = fts.rowid
                WHERE fts MATCH ?
                ORDER BY s.filename
                LIMIT ? OFFSET ?
            """
            params = [q, limit, offset]

        elif tags:
            # Tag filtering only
            tag_ids = [int(t) for t in tags.split(",")]

            if mode == "and":
                query = """
                    SELECT s.*
                    FROM samples s
                    WHERE s.id IN (
                        SELECT sample_id
                        FROM sample_tags
                        WHERE tag_id IN ({})
                        GROUP BY sample_id
                        HAVING COUNT(DISTINCT tag_id) = ?
                    )
                    ORDER BY s.filename
                    LIMIT ? OFFSET ?
                """.format(",".join("?" * len(tag_ids)))
                params = tag_ids + [len(tag_ids), limit, offset]
            else:
                query = """
                    SELECT DISTINCT s.*
                    FROM samples s
                    JOIN sample_tags st ON s.id = st.sample_id
                    WHERE st.tag_id IN ({})
                    ORDER BY s.filename
                    LIMIT ? OFFSET ?
                """.format(",".join("?" * len(tag_ids)))
                params = tag_ids + [limit, offset]

        else:
            # No search criteria - return all
            query = "SELECT * FROM samples ORDER BY filename LIMIT ? OFFSET ?"
            params = [limit, offset]

        cursor = conn.execute(query, params)
        samples = [dict(row) for row in cursor.fetchall()]

        # Get total count (simplified for MVP)
        total = len(samples)

        return {
            "samples": samples,
            "pagination": {"page": page, "limit": limit, "total": total},
            "query": q,
            "tags": tags,
            "mode": mode,
        }
