"""
Database initialization and connection management

New hash-based structure:
- Files identified by content hash (duplicate detection)
- Multiple locations per file (file reconciliation)
- Flexible metadata system (EAV pattern)
- No FTS tables (frontend search)
"""

import logging
import sqlite3
from pathlib import Path

from app.config import DATABASE_PATH
from app.system_metadata import ALL_METADATA_KEYS
from app.system_tags import SYSTEM_TAGS

logger = logging.getLogger(__name__)


class Database:
    """SQLite database manager with connection pooling"""

    def __init__(self, db_path: str = DATABASE_PATH, auto_create: bool = True):
        self.db_path = db_path
        if auto_create:
            self._ensure_database()

    def _ensure_database(self) -> None:
        """Create database file and tables if they don't exist"""
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)

        with self.get_connection() as conn:
            self._create_tables(conn)
            logger.info(f"Database initialized at {self.db_path}")

    def exists(self) -> bool:
        """Check if database file exists"""
        return Path(self.db_path).exists()

    def get_connection(self) -> sqlite3.Connection:
        """Get a new database connection"""
        conn = sqlite3.Connection(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def _create_tables(self, conn: sqlite3.Connection) -> None:
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

        # Scanned folders tracking (renamed sample_count to file_count)
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

        # Initialize system data
        self._initialize_system_data(conn)

    def _initialize_system_data(self, conn: sqlite3.Connection) -> None:
        """Initialize system tags and metadata keys if they don't exist"""

        # Insert system metadata keys
        for key in ALL_METADATA_KEYS:
            conn.execute("INSERT OR IGNORE INTO metadata_keys (key, is_system) VALUES (?, 1)", (key,))

        # Insert system tags
        for tag_name in SYSTEM_TAGS:
            conn.execute("INSERT OR IGNORE INTO tags (name, is_system) VALUES (?, 1)", (tag_name,))

        conn.commit()
        logger.info(f"Initialized {len(ALL_METADATA_KEYS)} system metadata keys and {len(SYSTEM_TAGS)} system tags")

    def check_health(self) -> bool:
        """Check if database is accessible and healthy"""
        try:
            with self.get_connection() as conn:
                conn.execute("SELECT 1").fetchone()
            return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False

    def clear_all_data(self) -> bool:
        """Clear all data from all tables (except system tags and metadata keys)"""
        try:
            with self.get_connection() as conn:
                # Delete in order to respect foreign key constraints
                conn.execute("DELETE FROM collection_tags")
                conn.execute("DELETE FROM collection_items")
                conn.execute("DELETE FROM collections")
                conn.execute("DELETE FROM file_locations")
                # TODO: might want to keep these for SYSTEM tags unless nuclear option is selected
                conn.execute("DELETE FROM file_tags")
                # TODO: probably want to keep these unless nuclear option is selected
                conn.execute("DELETE FROM file_metadata")
                conn.execute("DELETE FROM files")
                # Only delete non-system tags and metadata keys
                conn.execute("DELETE FROM tags WHERE is_system = 0 OR is_system IS NULL")
                conn.execute("DELETE FROM metadata_keys WHERE is_system = 0 OR is_system IS NULL")
                conn.execute("DELETE FROM folders")
                conn.commit()
                logger.info("All data cleared from database (preserved system tags and metadata keys)")
            return True
        except Exception as e:
            logger.error(f"Failed to clear all data: {e}")
            return False


# Global database instance (no auto-create - let user initialize via API)
db = Database(auto_create=False)
