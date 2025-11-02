"""Generate demo database with pre-scanned audio files"""

import logging
import sqlite3
from datetime import datetime

from app.demo.scanner import scan_demo_files, get_demo_folders

logger = logging.getLogger(__name__)

# Pre-defined tags that will be auto-assigned
DEMO_TAGS = [
    {"name": "kicks", "color": "#FF6B6B"},
    {"name": "snares", "color": "#4ECDC4"},
    {"name": "hihats", "color": "#45B7D1"},
    {"name": "synths", "color": "#6C5CE7"},
    {"name": "loops", "color": "#00B894"},
]

# Demo collections
DEMO_COLLECTIONS = [
    {"name": "Favorites", "description": "My favorite samples"},
    {"name": "505 Kit", "description": "Classic 505 drum machine samples"},
    {"name": "Ambient", "description": "Atmospheric and ambient sounds"},
]


def create_tables(conn: sqlite3.Connection):
    """Create all database tables"""

    # Samples table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS samples (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filepath TEXT NOT NULL UNIQUE,
            filename TEXT NOT NULL,
            file_hash TEXT NOT NULL,
            file_size INTEGER,
            duration REAL,
            sample_rate INTEGER,
            format TEXT,
            bit_depth INTEGER,
            channels INTEGER,
            title TEXT,
            artist TEXT,
            album TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_modified TIMESTAMP,
            indexed BOOLEAN DEFAULT 0
        )
    """)

    # Full-text search virtual table
    conn.execute("""
        CREATE VIRTUAL TABLE IF NOT EXISTS samples_fts USING fts5(
            filename,
            filepath,
            content=samples,
            content_rowid=id
        )
    """)

    # Tags table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            color TEXT,
            auto_generated BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Sample-Tag relationship
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sample_tags (
            sample_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            confidence REAL DEFAULT 1.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (sample_id, tag_id),
            FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )
    """)

    # Scanned folders tracking
    conn.execute("""
        CREATE TABLE IF NOT EXISTS folders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL UNIQUE,
            last_scanned TIMESTAMP,
            sample_count INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active'
        )
    """)

    # Collections
    conn.execute("""
        CREATE TABLE IF NOT EXISTS collections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Collection items
    conn.execute("""
        CREATE TABLE IF NOT EXISTS collection_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            collection_id INTEGER NOT NULL,
            sample_id INTEGER NOT NULL,
            alias TEXT,
            order_index INTEGER NOT NULL,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
            FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE,
            UNIQUE(collection_id, sample_id)
        )
    """)

    # Collection tags
    conn.execute("""
        CREATE TABLE IF NOT EXISTS collection_tags (
            collection_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            PRIMARY KEY (collection_id, tag_id),
            FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )
    """)

    # Indexes
    conn.execute("CREATE INDEX IF NOT EXISTS idx_samples_filepath ON samples(filepath)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_samples_filename ON samples(filename)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_samples_hash ON samples(file_hash)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_sample_tags_sample ON sample_tags(sample_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_sample_tags_tag ON sample_tags(tag_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_collection_items_sample ON collection_items(sample_id)")

    conn.commit()


def populate_tags(conn: sqlite3.Connection) -> dict[str, int]:
    """
    Insert demo tags into database

    Returns:
        dict mapping tag name to tag ID
    """
    tag_ids = {}

    for tag in DEMO_TAGS:
        cursor = conn.execute(
            "INSERT INTO tags (name, color, auto_generated) VALUES (?, ?, ?)", (tag["name"], tag["color"], 1)
        )
        tag_ids[tag["name"]] = cursor.lastrowid

    conn.commit()
    logger.info(f"Created {len(tag_ids)} demo tags")
    return tag_ids


def populate_samples(conn: sqlite3.Connection, samples: list[dict], tag_ids: dict[str, int]):
    """Insert samples and auto-assign tags based on folder names"""

    for sample in samples:
        # Insert sample
        cursor = conn.execute(
            """
            INSERT INTO samples
            (filepath, filename, file_hash, file_size, duration, sample_rate, format, channels, indexed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        """,
            (
                sample["filepath"],
                sample["filename"],
                sample["file_hash"],
                sample["file_size"],
                sample["duration"],
                sample["sample_rate"],
                sample["format"],
                sample["channels"],
            ),
        )
        sample_id = cursor.lastrowid

        # Auto-assign tag based on folder name
        folder_name = sample.get("folder", "")
        if folder_name in tag_ids:
            conn.execute(
                "INSERT INTO sample_tags (sample_id, tag_id, confidence) VALUES (?, ?, 1.0)",
                (sample_id, tag_ids[folder_name]),
            )

        # Also check filename for keywords and assign additional tags
        filename_lower = sample["filename"].lower()
        for tag_name, tag_id in tag_ids.items():
            if tag_name.lower() in filename_lower and tag_name != folder_name:
                try:
                    conn.execute(
                        "INSERT INTO sample_tags (sample_id, tag_id, confidence) VALUES (?, ?, 0.8)",
                        (sample_id, tag_id),
                    )
                except sqlite3.IntegrityError:
                    pass  # Tag already assigned

    conn.commit()
    logger.info(f"Populated {len(samples)} samples")


def populate_folders(conn: sqlite3.Connection, folders: list[dict]):
    """Insert scanned folders"""
    now = datetime.now().isoformat()

    for folder in folders:
        conn.execute(
            """
            INSERT INTO folders (path, last_scanned, sample_count, status)
            VALUES (?, ?, ?, 'active')
        """,
            (folder["path"], now, folder["sample_count"]),
        )

    conn.commit()
    logger.info(f"Created {len(folders)} folder entries")


def populate_collections(conn: sqlite3.Connection, sample_count: int):
    """Create demo collections with some samples"""

    for collection in DEMO_COLLECTIONS:
        cursor = conn.execute(
            """
            INSERT INTO collections (name, description)
            VALUES (?, ?)
        """,
            (collection["name"], collection["description"]),
        )
        collection_id = cursor.lastrowid

        # Add first 3-5 samples to each collection
        for i in range(1, min(6, sample_count + 1)):
            try:
                conn.execute(
                    """
                    INSERT INTO collection_items (collection_id, sample_id, alias, order_index)
                    VALUES (?, ?, NULL, ?)
                """,
                    (collection_id, i, i),
                )
            except sqlite3.IntegrityError:
                pass  # Sample might not exist

    conn.commit()
    logger.info(f"Created {len(DEMO_COLLECTIONS)} collections")


def generate_demo_database(db_path: str = ":memory:") -> sqlite3.Connection:
    """
    Create a complete demo database with scanned audio files

    Args:
        db_path: Path to database (":memory:" for in-memory)

    Returns:
        sqlite3.Connection with populated demo data
    """
    logger.info(f"Generating demo database at {db_path}")

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")

    # Create schema
    create_tables(conn)

    # Scan demo audio files
    samples = scan_demo_files()

    if not samples:
        logger.warning("No demo audio files found! Demo will be empty.")
        logger.warning("Add audio files to backend/demo/audio/ folder")
        return conn

    # Populate database
    tag_ids = populate_tags(conn)
    populate_samples(conn, samples, tag_ids)

    folders = get_demo_folders(samples)
    populate_folders(conn, folders)

    populate_collections(conn, len(samples))

    logger.info(f"Demo database generated successfully with {len(samples)} samples")
    return conn
