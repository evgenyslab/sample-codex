"""Audio file scanning service"""

import hashlib
import logging
import os
from pathlib import Path
from typing import Callable, Dict, List, Optional

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


def extract_audio_metadata(filepath: Path) -> Dict:
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


def scan_for_files(folder_paths: List[str], progress_callback: Optional[Callable] = None) -> List[Path]:
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


def process_files(audio_files: List[Path], progress_callback: Optional[Callable] = None) -> Dict:
    """
    Phase 2: Process audio files and extract metadata
    Bulk updates the database
    """
    stats = {"total": len(audio_files), "added": 0, "skipped": 0, "errors": 0}

    files_to_insert = []
    total_files = len(audio_files)

    with db.get_connection() as conn:
        # Get existing files to avoid duplicates
        existing_paths = set()
        cursor = conn.execute("SELECT filepath FROM samples")
        for row in cursor.fetchall():
            existing_paths.add(row["filepath"])

        # Process each file
        for idx, filepath in enumerate(audio_files):
            try:
                # Skip if already exists
                if str(filepath) in existing_paths:
                    stats["skipped"] += 1
                    continue

                # Get file info
                file_stat = filepath.stat()
                file_size = file_stat.st_size
                file_hash = get_file_hash(str(filepath))

                # Extract audio metadata
                metadata = extract_audio_metadata(filepath)

                files_to_insert.append(
                    {
                        "filepath": str(filepath),
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

                # TODO: BEFORE inserting, check for duplicate SHA's OR provide FE functionality!
                # Bulk insert every 100 files
                if len(files_to_insert) >= 100:
                    _bulk_insert_samples(conn, files_to_insert)
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
            _bulk_insert_samples(conn, files_to_insert)

        # Update folder statistics
        folder_paths = set(str(Path(f["filepath"]).parent) for f in files_to_insert)
        for folder_path in folder_paths:
            sample_count = conn.execute(
                "SELECT COUNT(*) as count FROM samples WHERE filepath LIKE ?", (f"{folder_path}%",)
            ).fetchone()["count"]

            conn.execute(
                """
                UPDATE folders
                SET sample_count = ?, last_scanned = datetime('now'), status = 'active'
                WHERE path LIKE ?
            """,
                (sample_count, f"{folder_path}%"),
            )

        conn.commit()

    # Send final progress
    if progress_callback:
        progress_callback("processing", 100, f"Complete: {stats['added']} added, {stats['skipped']} skipped")

    logger.info(f"Processing complete: {stats}")
    return stats


def _bulk_insert_samples(conn, files_data: List[Dict]):
    """Helper to bulk insert samples"""
    for file_data in files_data:
        conn.execute(
            """
            INSERT INTO samples
            (filepath, filename, file_hash, file_size, format, duration, sample_rate,
             bit_depth, channels, title, artist, album, indexed, last_modified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
        """,
            (
                file_data["filepath"],
                file_data["filename"],
                file_data["file_hash"],
                file_data["file_size"],
                file_data["format"],
                file_data.get("duration"),
                file_data.get("sample_rate"),
                file_data.get("bit_depth"),
                file_data.get("channels"),
                file_data.get("title"),
                file_data.get("artist"),
                file_data.get("album"),
            ),
        )

        # Update FTS index
        sample_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        conn.execute(
            """
            INSERT INTO samples_fts(rowid, filename, filepath)
            VALUES (?, ?, ?)
        """,
            (sample_id, file_data["filename"], file_data["filepath"]),
        )


def scan_folders_with_progress(folder_paths: List[str], progress_callback: Optional[Callable] = None) -> Dict:
    """
    Main scan function with two phases:
    1. Scan for files
    2. Process files and extract metadata
    """
    # Phase 1: Scan for files
    audio_files = scan_for_files(folder_paths, progress_callback)

    # Phase 2: Process files
    stats = process_files(audio_files, progress_callback)

    return stats


def scan_folders(folder_paths: List[str]) -> Dict:
    """
    Scan multiple folders and return combined statistics
    (Backward compatible version without progress updates)
    """
    return scan_folders_with_progress(folder_paths, progress_callback=None)
