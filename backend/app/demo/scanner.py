"""Scan demo audio folder and extract metadata"""

import hashlib
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

# Supported audio formats
AUDIO_EXTENSIONS = {".wav", ".mp3", ".flac", ".aiff", ".aif", ".ogg", ".m4a"}


def get_demo_audio_path() -> Path:
    """Get the path to the demo audio folder"""
    return Path(__file__).parent.parent.parent / "demo" / "audio"


def scan_demo_files() -> list[dict]:
    """
    Scan the demo/audio folder and return list of sample metadata

    Returns:
        list of dicts with sample info (filepath, filename, folder, etc.)
    """
    demo_path = get_demo_audio_path()

    if not demo_path.exists():
        logger.warning(f"Demo audio path does not exist: {demo_path}")
        return []

    samples = []

    # Walk through all subdirectories
    for root, _, files in os.walk(demo_path):
        root_path = Path(root)

        for filename in files:
            # Check if file is an audio file
            if Path(filename).suffix.lower() not in AUDIO_EXTENSIONS:
                continue

            full_path = root_path / filename

            # Get relative path from demo/audio root
            relative_path = full_path.relative_to(demo_path)

            # Extract folder name (parent directory)
            folder_name = relative_path.parent.name if relative_path.parent != Path(".") else "Root"

            # Generate file hash for uniqueness
            file_hash = hashlib.md5(str(relative_path).encode()).hexdigest()

            # Try to get basic file info
            try:
                file_size = full_path.stat().st_size
            except Exception:
                file_size = 0

            # Try to extract audio metadata (will be enhanced with librosa if available)
            duration = None
            sample_rate = None
            channels = None
            format_ext = full_path.suffix[1:].lower()  # Remove the dot

            # Try using librosa for metadata (optional)
            try:
                import soundfile as sf

                # Use soundfile for faster metadata reading
                info = sf.info(str(full_path))
                duration = info.duration
                sample_rate = info.samplerate
                channels = info.channels
            except Exception as e:
                logger.debug(f"Could not extract audio metadata for {filename}: {e}")
                # Set defaults
                duration = 1.0
                sample_rate = 44100
                channels = 2

            sample_data = {
                "filepath": f"/demo/audio/{relative_path}",
                "filename": filename,
                "file_hash": file_hash,
                "file_size": file_size,
                "duration": duration,
                "sample_rate": sample_rate,
                "format": format_ext,
                "channels": channels,
                "folder": folder_name,
            }

            samples.append(sample_data)
            logger.debug(f"Found demo sample: {relative_path}")

    logger.info(f"Scanned {len(samples)} demo audio files")
    return samples


def get_demo_folders(samples: list[dict]) -> list[dict]:
    """
    Extract unique folder structure from samples

    Args:
        samples: list of sample dicts from scan_demo_files()

    Returns:
        list of folder dicts with path and sample count
    """
    folder_counts = {}

    for sample in samples:
        # Extract folder path from sample filepath
        sample_path = Path(sample["filepath"])
        folder_path = sample_path.parent

        folder_str = str(folder_path)
        folder_counts[folder_str] = folder_counts.get(folder_str, 0) + 1

    folders = []
    for folder_path, count in folder_counts.items():
        folders.append(
            {
                "path": folder_path,
                "sample_count": count,
            }
        )

    return folders
