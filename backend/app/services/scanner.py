"""Audio file scanning service"""

import hashlib
import logging
import os
import sqlite3
from pathlib import Path
from typing import Callable

from mutagen import File as MutagenFile

from app.config import AUDIO_FORMATS
from app.database import db

logger = logging.getLogger(__name__)


def get_file_hash(filepath: str) -> str:
    """Calculate MD5 hash of file"""
    hash_md5 = hashlib.md5()
    try:
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    except Exception as e:
        logger.error(f"Error hashing file {filepath}: {e}")
        return ""


def extract_audio_metadata(filepath: Path) -> dict:
    """Extract audio metadata using mutagen"""
    try:
        audio = MutagenFile(str(filepath))
        if audio is None:
            return {}

        metadata = {
            "duration": getattr(audio.info, "length", None),
            "sample_rate": getattr(audio.info, "sample_rate", None),
            "bitrate": getattr(audio.info, "bitrate", None),
            "channels": getattr(audio.info, "channels", None),
        }

        # Extract common tags
        if audio.tags:
            metadata["title"] = (
                str(audio.tags.get("title", [""])[0])
                if hasattr(audio.tags.get("title", [""]), "__iter__")
                else str(audio.tags.get("title", ""))
            )
            metadata["artist"] = (
                str(audio.tags.get("artist", [""])[0])
                if hasattr(audio.tags.get("artist", [""]), "__iter__")
                else str(audio.tags.get("artist", ""))
            )
            metadata["album"] = (
                str(audio.tags.get("album", [""])[0])
                if hasattr(audio.tags.get("album", [""]), "__iter__")
                else str(audio.tags.get("album", ""))
            )

        return metadata
    except Exception as e:
        logger.error(f"Error extracting metadata from {filepath}: {e}")
        return {}


def scan_for_files(folder_paths: list[str], progress_callback: Callable | None = None) -> list[Path]:
    """
    Phase 1: Scan folders for audio files
    Returns list of all valid audio file paths found
    """
    all_audio_files = []
    total_folders = len(folder_paths)

    for idx, folder_path in enumerate(folder_paths):
        folder_path = Path(folder_path).resolve()

        if not folder_path.exists() or not folder_path.is_dir():
            logger.warning(f"Invalid folder path: {folder_path}")
            continue

        # Update folder status to scanning
        with db.get_connection() as conn:
            conn.execute("UPDATE folders SET status = 'scanning' WHERE path = ?", (str(folder_path),))
            conn.commit()

        # Recursively find all audio files
        for root, dirs, files in os.walk(folder_path):
            # Skip hidden directories
            dirs[:] = [d for d in dirs if not d.startswith(".")]

            for file in files:
                if any(file.lower().endswith(ext) for ext in AUDIO_FORMATS):
                    filepath = Path(root) / file
                    all_audio_files.append(filepath)

        # Send progress update
        if progress_callback:
            progress = int((idx + 1) / total_folders * 100)
            progress_callback("scanning", progress, f"Scanned {idx + 1}/{total_folders} folders")

    # Mark all folders as scanned
    with db.get_connection() as conn:
        for folder_path in folder_paths:
            conn.execute("UPDATE folders SET status = 'processing' WHERE path = ?", (str(Path(folder_path).resolve()),))
        conn.commit()

    logger.info(f"Found {len(all_audio_files)} audio files across {total_folders} folders")
    return all_audio_files


def process_files(audio_files: list[Path], folder_paths: list[str], progress_callback: Callable | None = None) -> dict:
    """
    Phase 2: Process audio files and extract metadata
    Hash-based insertion: same hash = same file, multiple locations possible
    """
    stats = {"total": len(audio_files), "added": 0, "skipped": 0, "errors": 0}

    files_to_insert = []
    total_files = len(audio_files)

    with db.get_connection() as conn:
        # Get existing file paths to avoid re-processing same location
        existing_paths = set()
        cursor = conn.execute("SELECT file_path FROM file_locations")
        for row in cursor.fetchall():
            existing_paths.add(row["file_path"])

        # Process each file
        for idx, filepath in enumerate(audio_files):
            try:
                filepath_str = str(filepath)

                # Skip if this exact path already exists
                if filepath_str in existing_paths:
                    stats["skipped"] += 1
                    continue

                # Get file info
                file_stat = filepath.stat()
                file_size = file_stat.st_size
                file_hash = get_file_hash(filepath_str)

                if not file_hash:
                    logger.warning(f"Could not hash file: {filepath_str}")
                    stats["errors"] += 1
                    continue

                # Extract audio metadata
                metadata = extract_audio_metadata(filepath)

                files_to_insert.append(
                    {
                        "filepath": filepath_str,
                        "filename": filepath.name,
                        "file_hash": file_hash,
                        "file_size": file_size,
                        "format": filepath.suffix.lower(),
                        "duration": metadata.get("duration"),
                        "sample_rate": metadata.get("sample_rate"),
                        "bit_depth": metadata.get("bitrate"),
                        "channels": metadata.get("channels"),
                        "title": metadata.get("title"),
                        "artist": metadata.get("artist"),
                        "album": metadata.get("album"),
                    }
                )

                stats["added"] += 1

                # Bulk insert every 100 files
                if len(files_to_insert) >= 100:
                    _bulk_insert_files(conn, files_to_insert)
                    files_to_insert = []

                # Send progress update
                if progress_callback and (idx + 1) % 10 == 0:
                    progress = int((idx + 1) / total_files * 100)
                    progress_callback("processing", progress, f"Processed {idx + 1}/{total_files} files")

            except Exception as e:
                logger.error(f"Error processing {filepath}: {e}")
                stats["errors"] += 1

        # Insert remaining files
        if files_to_insert:
            _bulk_insert_files(conn, files_to_insert)

        # Update folder statistics for ALL scanned folders
        for folder_path_str in folder_paths:
            folder_path = str(Path(folder_path_str).resolve())
            file_count = conn.execute(
                """
                SELECT COUNT(DISTINCT fl.file_id) as count
                FROM file_locations fl
                WHERE fl.file_path LIKE ?
            """,
                (f"{folder_path}%",),
            ).fetchone()["count"]

            conn.execute(
                """
                UPDATE folders
                SET file_count = ?, last_scanned = datetime('now'), status = 'active'
                WHERE path = ?
            """,
                (file_count, folder_path),
            )

        conn.commit()

    # Send final progress
    if progress_callback:
        progress_callback("processing", 100, f"Complete: {stats['added']} added, {stats['skipped']} skipped")

    logger.info(f"Processing complete: {stats}")
    return stats


def _get_or_create_metadata_key(conn: sqlite3.Connection, key: str) -> int:
    """Get or create metadata key, return key_id"""
    existing = conn.execute("SELECT id FROM metadata_keys WHERE key = ?", (key,)).fetchone()

    if existing:
        return existing["id"]

    conn.execute("INSERT INTO metadata_keys (key, is_system) VALUES (?, 1)", (key,))
    return conn.execute("SELECT last_insert_rowid()").fetchone()[0]


def _bulk_insert_files(conn, files_data: list[dict]):
    """
    Helper to bulk insert files using hash-based structure
    - Checks if file (by hash) already exists
    - If yes: adds new location
    - If no: creates file + location
    - Inserts metadata into file_metadata table
    """
    for file_data in files_data:
        file_hash = file_data["file_hash"]

        # Check if file (by hash) already exists
        existing = conn.execute("SELECT id FROM files WHERE file_hash = ?", (file_hash,)).fetchone()

        if existing:
            file_id = existing["id"]
            logger.debug(f"File hash {file_hash[:8]}... already exists as file_id {file_id}, adding new location")
        else:
            # Insert new file record
            conn.execute(
                """
                INSERT INTO files
                (file_hash, format, file_size, duration, sample_rate,
                 bit_depth, channels, indexed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
            """,
                (
                    file_hash,
                    file_data["format"],
                    file_data["file_size"],
                    file_data.get("duration"),
                    file_data.get("sample_rate"),
                    file_data.get("bit_depth"),
                    file_data.get("channels"),
                ),
            )
            file_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]

        # Always insert file location (new location for this file)
        conn.execute(
            """
            INSERT INTO file_locations
            (file_id, file_hash, file_path, file_name,
             discovered_at, last_verified, is_primary)
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), 1)
        """,
            (file_id, file_hash, file_data["filepath"], file_data["filename"]),
        )

        # Insert metadata if exists (only if new file, avoid duplicates)
        if not existing:
            metadata_items = {
                "title": file_data.get("title"),
                "artist": file_data.get("artist"),
                "album": file_data.get("album"),
            }

            for key, value in metadata_items.items():
                if value:  # Only insert if value exists
                    try:
                        key_id = _get_or_create_metadata_key(conn, key)
                        conn.execute(
                            """
                            INSERT OR REPLACE INTO file_metadata
                            (file_id, metadata_key_id, value, created_at)
                            VALUES (?, ?, ?, datetime('now'))
                        """,
                            (file_id, key_id, value),
                        )
                    except Exception as e:
                        logger.error(f"Error inserting metadata {key}={value}: {e}")


def scan_folders_with_progress(folder_paths: list[str], progress_callback: Callable | None = None) -> dict:
    """
    Main scan function with two phases:
    1. Scan for files
    2. Process files and extract metadata
    """
    # Phase 1: Scan for files
    audio_files = scan_for_files(folder_paths, progress_callback)

    # Phase 2: Process files
    return process_files(audio_files, folder_paths, progress_callback)


def scan_folders(folder_paths: list[str]) -> dict:
    """
    Scan multiple folders and return combined statistics
    (Backward compatible version without progress updates)
    """
    return scan_folders_with_progress(folder_paths, progress_callback=None)


def check_and_complete_incomplete_scans() -> dict:
    """
    Check for folders with incomplete scans and complete them.
    This runs on application startup to ensure data consistency.

    Returns statistics about resumed scans.
    """
    stats = {"resumed": 0, "completed": 0, "errors": 0}

    with db.get_connection() as conn:
        # Find folders that are not in 'active' status
        cursor = conn.execute(
            "SELECT path FROM folders WHERE status != 'active'",
        )
        incomplete_folders = [row["path"] for row in cursor.fetchall()]

        if not incomplete_folders:
            logger.info("No incomplete scans found on startup")
            return stats

        logger.info(f"Found {len(incomplete_folders)} incomplete folder scans on startup")
        stats["resumed"] = len(incomplete_folders)

        # Reset status to 'pending' for all incomplete folders
        for folder_path in incomplete_folders:
            conn.execute("UPDATE folders SET status = 'pending' WHERE path = ?", (folder_path,))
        conn.commit()

    # Resume scanning for all incomplete folders
    try:
        logger.info(f"Resuming scans for {len(incomplete_folders)} folders...")
        result = scan_folders(incomplete_folders)
        stats["completed"] = result.get("added", 0)
        stats["errors"] = result.get("errors", 0)
        logger.info(f"Startup scan completion: {stats}")
    except Exception as e:
        logger.error(f"Error completing incomplete scans on startup: {e}")
        stats["errors"] += 1

    return stats
