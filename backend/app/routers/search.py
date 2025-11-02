"""Search API endpoints"""

from fastapi import APIRouter, Request

from app.config import ITEMS_PER_PAGE
from app.db_connection import get_db_connection

router = APIRouter()


@router.get("")
async def search_files(
    request: Request,
    q: str | None = None,
    tags: str | None = None,  # Comma-separated tag IDs
    mode: str = "and",  # 'and' or 'or' for tag filtering
    page: int = 1,
    limit: int = ITEMS_PER_PAGE,
):
    """Search files by text and/or tags"""
    offset = (page - 1) * limit

    with get_db_connection(request) as conn:
        # Build base query
        if q and tags:
            # Text search + tag filtering
            tag_ids = [int(t) for t in tags.split(",")]
            search_pattern = f"%{q}%"

            if mode == "and":
                # File must have ALL specified tags and match text
                query = """
                    SELECT DISTINCT f.*
                    FROM files f
                    JOIN file_locations fl ON f.id = fl.file_id
                    WHERE (fl.file_name LIKE ? OR fl.file_path LIKE ? OR f.alias LIKE ?)
                    AND f.id IN (
                        SELECT file_id
                        FROM file_tags
                        WHERE tag_id IN ({})
                        GROUP BY file_id
                        HAVING COUNT(DISTINCT tag_id) = ?
                    )
                    ORDER BY fl.file_name
                    LIMIT ? OFFSET ?
                """.format(",".join("?" * len(tag_ids)))
                params = [search_pattern, search_pattern, search_pattern] + tag_ids + [len(tag_ids), limit, offset]
            else:
                # File must have ANY of the specified tags and match text
                query = """
                    SELECT DISTINCT f.*
                    FROM files f
                    JOIN file_locations fl ON f.id = fl.file_id
                    JOIN file_tags ft ON f.id = ft.file_id
                    WHERE (fl.file_name LIKE ? OR fl.file_path LIKE ? OR f.alias LIKE ?)
                    AND ft.tag_id IN ({})
                    ORDER BY fl.file_name
                    LIMIT ? OFFSET ?
                """.format(",".join("?" * len(tag_ids)))
                params = [search_pattern, search_pattern, search_pattern] + tag_ids + [limit, offset]

        elif q:
            # Text search only (search in filename, path, and alias)
            search_pattern = f"%{q}%"
            query = """
                SELECT DISTINCT f.*
                FROM files f
                JOIN file_locations fl ON f.id = fl.file_id
                WHERE fl.file_name LIKE ? OR fl.file_path LIKE ? OR f.alias LIKE ?
                ORDER BY fl.file_name
                LIMIT ? OFFSET ?
            """
            params = [search_pattern, search_pattern, search_pattern, limit, offset]

        elif tags:
            # Tag filtering only
            tag_ids = [int(t) for t in tags.split(",")]

            if mode == "and":
                query = """
                    SELECT DISTINCT f.*
                    FROM files f
                    JOIN file_locations fl ON f.id = fl.file_id
                    WHERE f.id IN (
                        SELECT file_id
                        FROM file_tags
                        WHERE tag_id IN ({})
                        GROUP BY file_id
                        HAVING COUNT(DISTINCT tag_id) = ?
                    )
                    ORDER BY fl.file_name
                    LIMIT ? OFFSET ?
                """.format(",".join("?" * len(tag_ids)))
                params = tag_ids + [len(tag_ids), limit, offset]
            else:
                query = """
                    SELECT DISTINCT f.*
                    FROM files f
                    JOIN file_locations fl ON f.id = fl.file_id
                    JOIN file_tags ft ON f.id = ft.file_id
                    WHERE ft.tag_id IN ({})
                    ORDER BY fl.file_name
                    LIMIT ? OFFSET ?
                """.format(",".join("?" * len(tag_ids)))
                params = tag_ids + [limit, offset]

        else:
            # No search criteria - return all files
            query = """
                SELECT DISTINCT f.*
                FROM files f
                JOIN file_locations fl ON f.id = fl.file_id
                WHERE fl.is_primary = 1
                ORDER BY fl.file_name
                LIMIT ? OFFSET ?
            """
            params = [limit, offset]

        cursor = conn.execute(query, params)
        files = [dict(row) for row in cursor.fetchall()]

        # Get total count (simplified for MVP)
        total = len(files)

        return {
            "files": files,
            "pagination": {"page": page, "limit": limit, "total": total},
            "query": q,
            "tags": tags,
            "mode": mode,
        }
