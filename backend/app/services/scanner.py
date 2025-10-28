"""Audio file scanning service"""
import os
import hashlib
from pathlib import Path
from typing import List, Dict
import logging

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


def scan_folder(folder_path: str) -> Dict:
    """
    Scan a folder for audio files and add them to database
    Returns statistics about the scan
    """
    folder_path = Path(folder_path).resolve()

    if not folder_path.exists() or not folder_path.is_dir():
        raise ValueError(f"Invalid folder path: {folder_path}")

    stats = {
        "found": 0,
        "added": 0,
        "skipped": 0,
        "errors": 0
    }

    with db.get_connection() as conn:
        # Update folder status to scanning
        conn.execute(
            "UPDATE folders SET status = 'scanning' WHERE path = ?",
            (str(folder_path),)
        )
        conn.commit()

        # Recursively find all audio files
        audio_files = []
        for root, dirs, files in os.walk(folder_path):
            # Skip hidden directories
            dirs[:] = [d for d in dirs if not d.startswith('.')]

            for file in files:
                if any(file.lower().endswith(ext) for ext in AUDIO_FORMATS):
                    filepath = Path(root) / file
                    audio_files.append(filepath)
                    stats["found"] += 1

        logger.info(f"Found {len(audio_files)} audio files in {folder_path}")

        # Process each audio file
        for filepath in audio_files:
            try:
                # Check if file already exists
                existing = conn.execute(
                    "SELECT id FROM samples WHERE filepath = ?",
                    (str(filepath),)
                ).fetchone()

                if existing:
                    stats["skipped"] += 1
                    continue

                # Get file info
                file_stat = filepath.stat()
                file_size = file_stat.st_size
                file_hash = get_file_hash(str(filepath))

                # For now, we'll add basic metadata
                # In a full implementation, use librosa or pydub for audio metadata
                conn.execute("""
                    INSERT INTO samples
                    (filepath, filename, file_hash, file_size, format, indexed, last_modified)
                    VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
                """, (
                    str(filepath),
                    filepath.name,
                    file_hash,
                    file_size,
                    filepath.suffix.lower()
                ))

                # Update FTS index
                sample_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
                conn.execute("""
                    INSERT INTO samples_fts(rowid, filename, filepath)
                    VALUES (?, ?, ?)
                """, (sample_id, filepath.name, str(filepath)))

                stats["added"] += 1

            except Exception as e:
                logger.error(f"Error processing {filepath}: {e}")
                stats["errors"] += 1

        # Update folder statistics
        sample_count = conn.execute(
            "SELECT COUNT(*) as count FROM samples WHERE filepath LIKE ?",
            (f"{str(folder_path)}%",)
        ).fetchone()["count"]

        conn.execute("""
            UPDATE folders
            SET sample_count = ?, last_scanned = datetime('now'), status = 'active'
            WHERE path = ?
        """, (sample_count, str(folder_path)))

        conn.commit()

    logger.info(f"Scan complete: {stats}")
    return stats


def scan_folders(folder_paths: List[str]) -> Dict:
    """Scan multiple folders and return combined statistics"""
    total_stats = {
        "found": 0,
        "added": 0,
        "skipped": 0,
        "errors": 0,
        "folders_processed": 0
    }

    for folder_path in folder_paths:
        try:
            stats = scan_folder(folder_path)
            total_stats["found"] += stats["found"]
            total_stats["added"] += stats["added"]
            total_stats["skipped"] += stats["skipped"]
            total_stats["errors"] += stats["errors"]
            total_stats["folders_processed"] += 1
        except Exception as e:
            logger.error(f"Error scanning folder {folder_path}: {e}")
            total_stats["errors"] += 1

    return total_stats
