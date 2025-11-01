"""
Migration: Add alias column to collection_items table

This migration adds the alias column to allow users to give custom names
to samples within collections.
"""

import sqlite3


def upgrade(conn: sqlite3.Connection):
    """Add alias column to collection_items table"""
    print("Running migration: 003_add_alias_to_collection_items")

    # Add alias column (nullable, defaults to NULL)
    conn.execute("""
        ALTER TABLE collection_items ADD COLUMN alias TEXT
    """)

    conn.commit()
    print("✓ Added alias column to collection_items table")


def downgrade(conn: sqlite3.Connection):
    """Remove alias column from collection_items table"""
    print("Rolling back migration: 003_add_alias_to_collection_items")

    # SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
    conn.execute("""
        CREATE TABLE collection_items_backup (
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

    conn.execute("""
        INSERT INTO collection_items_backup (id, collection_id, sample_id, order_index, added_at)
        SELECT id, collection_id, sample_id, order_index, added_at FROM collection_items
    """)

    conn.execute("DROP TABLE collection_items")
    conn.execute("ALTER TABLE collection_items_backup RENAME TO collection_items")

    # Recreate indexes
    conn.execute("CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_collection_items_sample ON collection_items(sample_id)")

    conn.commit()
    print("✓ Removed alias column from collection_items table")
