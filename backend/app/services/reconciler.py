"""File reconciliation service - verifies file locations exist on disk"""

import logging
from pathlib import Path
from typing import Callable

from app.database import db

logger = logging.getLogger(__name__)


def reconcile_files(progress_callback: Callable | None = None) -> dict:
    """
    Verify all file locations exist on disk

    Files with missing locations are preserved but marked as unavailable.
    Uses last_verified field: NULL = missing, datetime = valid

    Returns:
        {
            'total_files': int,
            'total_locations': int,
            'valid_locations': int,
            'missing_locations': int,
            'orphaned_files': int,  # Files with zero valid locations
            'missing_details': [
                {
                    'file_id': int,
                    'file_hash': str,
                    'location_id': int,
                    'file_path': str,
                    'was_primary': bool
                }
            ]
        }
    """

    logger.info("Starting file reconciliation...")

    stats = {
        "total_files": 0,
        "total_locations": 0,
        "valid_locations": 0,
        "missing_locations": 0,
        "orphaned_files": 0,
        "missing_details": [],
    }

    with db.get_connection() as conn:
        # Get all file locations
        locations = conn.execute(
            """
            SELECT
                fl.id as location_id,
                fl.file_id,
                fl.file_path,
                fl.is_primary,
                f.file_hash
            FROM file_locations fl
            JOIN files f ON fl.file_id = f.id
            WHERE f.indexed = 1
            ORDER BY fl.file_id, fl.is_primary DESC
        """
        ).fetchall()

        stats["total_locations"] = len(locations)
        logger.info(f"Found {len(locations)} file locations to verify")

        file_validity = {}  # Track which files have valid locations

        for idx, loc in enumerate(locations):
            location_id = loc["location_id"]
            file_id = loc["file_id"]
            file_path = loc["file_path"]
            is_primary = loc["is_primary"]
            file_hash = loc["file_hash"]

            # Check if file exists
            exists = Path(file_path).exists()

            if exists:
                # Update last_verified to now
                conn.execute(
                    "UPDATE file_locations SET last_verified = datetime('now') WHERE id = ?",
                    (location_id,),
                )
                stats["valid_locations"] += 1
                file_validity[file_id] = True  # Mark file as having valid location
            else:
                # Set last_verified to NULL to mark as missing
                conn.execute(
                    "UPDATE file_locations SET last_verified = NULL WHERE id = ?",
                    (location_id,),
                )
                stats["missing_locations"] += 1
                stats["missing_details"].append(
                    {
                        "file_id": file_id,
                        "file_hash": file_hash,
                        "location_id": location_id,
                        "file_path": file_path,
                        "was_primary": bool(is_primary),
                    }
                )

                logger.debug(f"Missing file: {file_path}")

                # If this was primary, try to promote another location
                if is_primary:
                    # Find another valid location for this file (one we just verified as existing)
                    other_valid = conn.execute(
                        """
                        SELECT id FROM file_locations
                        WHERE file_id = ? AND id != ?
                        ORDER BY discovered_at ASC
                        LIMIT 1
                    """,
                        (file_id, location_id),
                    ).fetchone()

                    if other_valid:
                        other_id = other_valid["id"]
                        # Check if this other location exists
                        other_path_row = conn.execute(
                            "SELECT file_path FROM file_locations WHERE id = ?", (other_id,)
                        ).fetchone()
                        if other_path_row and Path(other_path_row["file_path"]).exists():
                            # Demote this one
                            conn.execute(
                                "UPDATE file_locations SET is_primary = 0 WHERE id = ?",
                                (location_id,),
                            )
                            # Promote the other one
                            conn.execute(
                                "UPDATE file_locations SET is_primary = 1 WHERE id = ?",
                                (other_id,),
                            )
                            logger.info(f"Promoted location {other_id} to primary for file {file_id}")

            # Progress callback
            if progress_callback and (idx + 1) % 50 == 0:
                progress = int((idx + 1) / len(locations) * 100)
                progress_callback(
                    "reconciling", progress, f"Checked {idx + 1}/{len(locations)} locations"
                )

        conn.commit()

        # Count orphaned files (files with no valid locations)
        orphaned = conn.execute(
            """
            SELECT COUNT(DISTINCT f.id) as count
            FROM files f
            WHERE f.indexed = 1
            AND NOT EXISTS (
                SELECT 1 FROM file_locations fl
                WHERE fl.file_id = f.id AND fl.last_verified IS NOT NULL
            )
        """
        ).fetchone()

        stats["orphaned_files"] = orphaned["count"]

        # Count total files
        total = conn.execute("SELECT COUNT(*) as count FROM files WHERE indexed = 1").fetchone()
        stats["total_files"] = total["count"]

    logger.info(f"Reconciliation complete: {stats}")
    return stats
