"""
Migration: Insert system tags

This migration inserts the predefined system tags from system_tags.py
These tags are marked as is_system=1 and cannot be deleted by users.
"""

import sqlite3

from app.system_tags import SYSTEM_TAGS


def upgrade(conn: sqlite3.Connection):
    """Insert system tags"""
    print("Running migration: 002_insert_system_tags")

    inserted_count = 0
    skipped_count = 0

    for tag_name in SYSTEM_TAGS:
        try:
            # Check if tag already exists
            existing = conn.execute("SELECT id FROM tags WHERE name = ?", (tag_name,)).fetchone()

            if existing:
                # Update existing tag to be a system tag
                conn.execute("UPDATE tags SET is_system = 1 WHERE name = ?", (tag_name,))
                skipped_count += 1
                print(f"  ↻ Updated existing tag: {tag_name}")
            else:
                # Insert new system tag
                conn.execute(
                    """
                    INSERT INTO tags (name, is_system, auto_generated, created_at)
                    VALUES (?, 1, 0, CURRENT_TIMESTAMP)
                    """,
                    (tag_name,),
                )
                inserted_count += 1
                print(f"  + Inserted system tag: {tag_name}")

        except sqlite3.IntegrityError as e:
            print(f"  ! Warning: Could not insert tag '{tag_name}': {e}")
            skipped_count += 1
            continue

    conn.commit()
    print(f"✓ Migration complete: {inserted_count} inserted, {skipped_count} updated/skipped")


def downgrade(conn: sqlite3.Connection):
    """Remove system tags"""
    print("Rolling back migration: 002_insert_system_tags")

    # Get list of system tag names
    tag_names = ",".join([f"'{tag}'" for tag in SYSTEM_TAGS])

    # Delete system tags (only those without any sample associations to be safe)
    result = conn.execute(
        f"""
        DELETE FROM tags
        WHERE name IN ({tag_names})
        AND is_system = 1
        AND id NOT IN (SELECT DISTINCT tag_id FROM sample_tags)
        """
    )

    deleted_count = result.rowcount

    # For tags with associations, just mark them as non-system
    conn.execute(
        f"""
        UPDATE tags
        SET is_system = 0
        WHERE name IN ({tag_names})
        AND is_system = 1
        """
    )

    conn.commit()
    print(f"✓ Removed system flag from system tags ({deleted_count} deleted)")
