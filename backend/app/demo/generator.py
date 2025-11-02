"""Generate demo database with pre-scanned audio files using hash-based structure"""

import logging
import sqlite3
from datetime import datetime

from app.demo.scanner import get_demo_folders, scan_demo_files
from app.system_metadata import ALL_METADATA_KEYS
from app.system_tags import SYSTEM_TAGS

logger = logging.getLogger(__name__)

# Pre-defined demo tags (in addition to system tags)
DEMO_TAGS = [
    {"name": "demo", "color": "#FF6B6B", "is_system": False},
]

# Demo collections
DEMO_COLLECTIONS = [
    {"name": "Favorites", "description": "My favorite samples"},
    {"name": "505 Kit", "description": "Classic 505 drum machine samples"},
    {"name": "Ambient", "description": "Atmospheric and ambient sounds"},
]


def create_tables(conn: sqlite3.Connection):
    """Create all database tables with new hash-based structure"""

    # Files table - Core file properties (hash-based identity)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_hash TEXT NOT NULL UNIQUE,
            format TEXT NOT NULL,
            file_size INTEGER,
            duration REAL,
            sample_rate INTEGER,
            bit_depth INTEGER,
            channels INTEGER,
            alias TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            indexed BOOLEAN DEFAULT 1
        )
    """)

    # File locations table - Multiple locations per file
    conn.execute("""
        CREATE TABLE IF NOT EXISTS file_locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id INTEGER NOT NULL,
            file_hash TEXT NOT NULL,
            file_path TEXT NOT NULL UNIQUE,
            file_name TEXT NOT NULL,
            discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_verified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_primary BOOLEAN DEFAULT 1,
            FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
        )
    """)

    # Metadata keys table - Extensible metadata system
    conn.execute("""
        CREATE TABLE IF NOT EXISTS metadata_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT NOT NULL UNIQUE,
            is_system BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # File metadata table - EAV pattern for flexible metadata
    conn.execute("""
        CREATE TABLE IF NOT EXISTS file_metadata (
            file_id INTEGER NOT NULL,
            metadata_key_id INTEGER NOT NULL,
            value TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (file_id, metadata_key_id),
            FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
            FOREIGN KEY (metadata_key_id) REFERENCES metadata_keys(id) ON DELETE CASCADE
        )
    """)

    # Tags table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            color TEXT,
            icon TEXT,
            is_system BOOLEAN DEFAULT 0,
            auto_generated BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # File-Tag relationship (renamed from sample_tags)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS file_tags (
            file_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            confidence REAL DEFAULT 1.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (file_id, tag_id),
            FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )
    """)

    # Scanned folders tracking (changed sample_count to file_count)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS folders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL UNIQUE,
            last_scanned TIMESTAMP,
            file_count INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active'
        )
    """)

    # Collections (added color and icon)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS collections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            color TEXT,
            icon TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Collection items (changed sample_id to file_id, removed alias)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS collection_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            collection_id INTEGER NOT NULL,
            file_id INTEGER NOT NULL,
            order_index INTEGER NOT NULL,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
            FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
            UNIQUE(collection_id, file_id)
        )
    """)

    # Collection tags (kept)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS collection_tags (
            collection_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            PRIMARY KEY (collection_id, tag_id),
            FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )
    """)

    # Indexes for files and locations
    conn.execute("CREATE INDEX IF NOT EXISTS idx_files_hash ON files(file_hash)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_file_locations_file_id ON file_locations(file_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_file_locations_hash ON file_locations(file_hash)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_file_locations_path ON file_locations(file_path)")

    # Indexes for metadata
    conn.execute("CREATE INDEX IF NOT EXISTS idx_file_metadata_file_id ON file_metadata(file_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_file_metadata_key_id ON file_metadata(metadata_key_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_metadata_keys_system ON metadata_keys(is_system)")

    # Indexes for tags
    conn.execute("CREATE INDEX IF NOT EXISTS idx_file_tags_file ON file_tags(file_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_file_tags_tag ON file_tags(tag_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_tags_system ON tags(is_system)")

    # Indexes for collections
    conn.execute("CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_collection_items_file ON collection_items(file_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_collection_tags_collection ON collection_tags(collection_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_collection_tags_tag ON collection_tags(tag_id)")

    conn.commit()


def init_system_data(conn: sqlite3.Connection):
    """Initialize system metadata keys and system tags"""

    # Insert system metadata keys
    for key in ALL_METADATA_KEYS:
        conn.execute("INSERT OR IGNORE INTO metadata_keys (key, is_system) VALUES (?, 1)", (key,))

    # Insert system tags
    for tag_name in SYSTEM_TAGS:
        conn.execute("INSERT OR IGNORE INTO tags (name, is_system) VALUES (?, 1)", (tag_name,))

    conn.commit()
    logger.info(f"Initialized {len(ALL_METADATA_KEYS)} system metadata keys and {len(SYSTEM_TAGS)} system tags")


def populate_tags(conn: sqlite3.Connection) -> dict[str, int]:
    """
    Insert demo tags into database (in addition to system tags)

    Returns:
        dict mapping tag name to tag ID
    """
    tag_ids = {}

    # Get all tags (including system tags) for auto-tagging
    cursor = conn.execute("SELECT id, name FROM tags")
    for row in cursor.fetchall():
        tag_ids[row["name"]] = row["id"]

    # Add demo-specific tags
    for tag in DEMO_TAGS:
        try:
            cursor = conn.execute(
                "INSERT INTO tags (name, color, auto_generated, is_system) VALUES (?, ?, 1, ?)",
                (tag["name"], tag["color"], tag["is_system"]),
            )
            tag_ids[tag["name"]] = cursor.lastrowid
        except sqlite3.IntegrityError:
            # Tag already exists
            pass

    conn.commit()
    logger.info(f"Initialized tags (including {len(SYSTEM_TAGS)} system tags)")
    return tag_ids


def populate_samples(conn: sqlite3.Connection, samples: list[dict], tag_ids: dict[str, int]):
    """Insert samples using new hash-based structure and auto-assign tags"""

    for sample in samples:
        file_hash = sample["file_hash"]

        # Check if file (by hash) already exists
        existing = conn.execute("SELECT id FROM files WHERE file_hash = ?", (file_hash,)).fetchone()

        if existing:
            file_id = existing["id"]
            logger.debug(f"File hash {file_hash[:8]}... already exists")
        else:
            # Insert new file record
            cursor = conn.execute(
                """
                INSERT INTO files
                (file_hash, format, file_size, duration, sample_rate, bit_depth, channels, indexed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
            """,
                (
                    file_hash,
                    sample["format"],
                    sample["file_size"],
                    sample["duration"],
                    sample["sample_rate"],
                    sample.get("bit_depth"),
                    sample["channels"],
                ),
            )
            file_id = cursor.lastrowid

        # Always insert file location
        try:  # noqa: SIM105
            conn.execute(
                """
                INSERT INTO file_locations
                (file_id, file_hash, file_path, file_name, discovered_at, last_verified, is_primary)
                VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), 1)
            """,
                (
                    file_id,
                    file_hash,
                    sample["filepath"],
                    sample["filename"],
                ),
            )
        except sqlite3.IntegrityError:
            # Location already exists
            pass

        # Auto-assign tag based on folder name
        folder_name = sample.get("folder", "")
        if folder_name in tag_ids:
            try:  # noqa: SIM105
                conn.execute(
                    "INSERT OR IGNORE INTO file_tags (file_id, tag_id, confidence) VALUES (?, ?, 1.0)",
                    (file_id, tag_ids[folder_name]),
                )
            except sqlite3.IntegrityError:
                pass

        # Also check filename for keywords and assign additional tags
        filename_lower = sample["filename"].lower()
        for tag_name, tag_id in tag_ids.items():
            if tag_name.lower() in filename_lower and tag_name != folder_name:
                try:  # noqa: SIM105
                    conn.execute(
                        "INSERT OR IGNORE INTO file_tags (file_id, tag_id, confidence) VALUES (?, ?, 0.8)",
                        (file_id, tag_id),
                    )
                except sqlite3.IntegrityError:
                    pass  # Tag already assigned

    conn.commit()
    logger.info(f"Populated {len(samples)} samples")


def populate_folders(conn: sqlite3.Connection, folders: list[dict]):
    """Insert scanned folders with new file_count field"""
    now = datetime.now().isoformat()

    for folder in folders:
        conn.execute(
            """
            INSERT INTO folders (path, last_scanned, file_count, status)
            VALUES (?, ?, ?, 'active')
        """,
            (folder["path"], now, folder["sample_count"]),  # Note: sample_count from scanner maps to file_count
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
            try:  # noqa: SIM105
                conn.execute(
                    """
                    INSERT INTO collection_items (collection_id, file_id, order_index)
                    VALUES (?, ?, ?)
                """,
                    (collection_id, i, i),
                )
            except sqlite3.IntegrityError:
                pass  # Sample might not exist

    conn.commit()
    logger.info(f"Created {len(DEMO_COLLECTIONS)} collections")


def generate_demo_database(db_path: str = ":memory:") -> sqlite3.Connection:
    """
    Create a complete demo database with scanned audio files using new hash-based structure

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

    # Initialize system data (tags and metadata keys)
    init_system_data(conn)

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
