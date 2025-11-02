"""
System Metadata Keys Definition

This file contains the predefined system metadata keys that are automatically created
and managed by the application. These keys cannot be deleted by users.

Modify this file before deployment to customize the default metadata key set.
"""

# Standard audio metadata keys (ID3/Vorbis Comment compatible)
SYSTEM_METADATA_KEYS = [
    "title",
    "artist",
    "album",
    "year",
    "genre",
    "bpm",
    "key",  # Musical key (e.g., "C Major", "Am")
    "comment",
    "composer",
    "publisher",
    "copyright",
    "isrc",  # International Standard Recording Code
]

# Additional metadata keys for sample management
EXTENDED_METADATA_KEYS = [
    "original_filename",  # Original name before any processing
    "source",  # Where the sample came from (e.g., "Splice", "Recorded", "Synthesized")
    "instrument",  # Specific instrument name
    "notes",  # User notes about the sample
]

# Combined list of all metadata keys
ALL_METADATA_KEYS = SYSTEM_METADATA_KEYS + EXTENDED_METADATA_KEYS

# Metadata key descriptions for UI hints
METADATA_DESCRIPTIONS = {
    "title": "Track or sample title",
    "artist": "Artist or creator name",
    "album": "Album or sample pack name",
    "year": "Release year",
    "genre": "Musical genre",
    "bpm": "Tempo in beats per minute",
    "key": "Musical key (e.g., C Major, Am)",
    "comment": "Additional comments",
    "composer": "Composer name",
    "publisher": "Publisher or label",
    "copyright": "Copyright information",
    "isrc": "International Standard Recording Code",
    "original_filename": "Original filename before processing",
    "source": "Source of the sample",
    "instrument": "Specific instrument",
    "notes": "User notes",
}
