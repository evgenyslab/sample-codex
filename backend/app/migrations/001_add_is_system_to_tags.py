"""
Migration: Add is_system column to tags table

This migration adds the is_system column to track system-managed tags
that cannot be deleted by users.
"""

import sqlite3


def upgrade(conn: sqlite3.Connection):
    """Add is_system column to tags table"""
    print("Running migration: 001_add_is_system_to_tags")

    # Add is_system column (default to 0/False for existing tags)
    conn.execute("""
        ALTER TABLE tags ADD COLUMN is_system BOOLEAN DEFAULT 0
    """)

    # Create index for faster queries on system tags
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_tags_is_system ON tags(is_system)
    """)

    conn.commit()
    print("✓ Added is_system column to tags table")


def downgrade(conn: sqlite3.Connection):
    """Remove is_system column from tags table"""
    print("Rolling back migration: 001_add_is_system_to_tags")

    # SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
    conn.execute("""
        CREATE TABLE tags_backup (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            color TEXT,
            auto_generated BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.execute("""
        INSERT INTO tags_backup (id, name, color, auto_generated, created_at)
        SELECT id, name, color, auto_generated, created_at FROM tags
    """)

    conn.execute("DROP TABLE tags")
    conn.execute("ALTER TABLE tags_backup RENAME TO tags")

    conn.commit()
    print("✓ Removed is_system column from tags table")
