"""
Database initialization and connection management

TODO:
- Default tag ENUMs in db migration
- Add support for db migrations for different db versions
- add file SHA's to DB to avoid duplicates & allow re-discovery of files


"""

import logging
import sqlite3
from pathlib import Path

from app.config import DATABASE_PATH

logger = logging.getLogger(__name__)


class Database:
    """SQLite database manager with connection pooling"""

    def __init__(self, db_path: str = DATABASE_PATH):
        self.db_path = db_path
        self._ensure_database()

    def _ensure_database(self) -> None:
        """Create database file and tables if they don't exist"""
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)

        with self.get_connection() as conn:
            self._create_tables(conn)
            logger.info(f"Database initialized at {self.db_path}")

    def get_connection(self) -> sqlite3.Connection:
        """Get a new database connection"""
        conn = sqlite3.Connection(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def _migrate_add_metadata_columns(self, conn: sqlite3.Connection) -> None:
        """Add metadata columns to existing samples table if they don't exist"""
        try:
            # Check if columns exist
            cursor = conn.execute("PRAGMA table_info(samples)")
            columns = [row[1] for row in cursor.fetchall()]

            # Add missing columns
            if "title" not in columns:
                conn.execute("ALTER TABLE samples ADD COLUMN title TEXT")
                logger.info("Added 'title' column to samples table")

            if "artist" not in columns:
                conn.execute("ALTER TABLE samples ADD COLUMN artist TEXT")
                logger.info("Added 'artist' column to samples table")

            if "album" not in columns:
                conn.execute("ALTER TABLE samples ADD COLUMN album TEXT")
                logger.info("Added 'album' column to samples table")

            conn.commit()
        except Exception as e:
            logger.error(f"Error during metadata columns migration: {e}")
            # Don't raise - table might not exist yet

    def _create_tables(self, conn: sqlite3.Connection) -> None:
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

        # Migration: Add new metadata columns if they don't exist
        self._migrate_add_metadata_columns(conn)

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
        """Clear all data from all tables"""
        try:
            with self.get_connection() as conn:
                # Delete in order to respect foreign key constraints
                conn.execute("DELETE FROM collection_tags")
                conn.execute("DELETE FROM collection_items")
                conn.execute("DELETE FROM collections")
                conn.execute("DELETE FROM sample_tags")
                conn.execute("DELETE FROM samples_fts")
                conn.execute("DELETE FROM samples")
                conn.execute("DELETE FROM tags")
                conn.execute("DELETE FROM folders")
                conn.commit()
                logger.info("All data cleared from database")
            return True
        except Exception as e:
            logger.error(f"Failed to clear all data: {e}")
            return False


# Global database instance
db = Database()
