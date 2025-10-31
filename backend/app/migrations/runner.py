"""
Migration Runner

Manages database migrations in order.
"""

import importlib
import sqlite3
from pathlib import Path


def get_migration_files():
    """Get all migration files in order"""
    migrations_dir = Path(__file__).parent
    migration_files = sorted([f for f in migrations_dir.glob("*.py") if f.name[0].isdigit()])
    return migration_files


def get_applied_migrations(conn: sqlite3.Connection):
    """Get list of applied migrations"""
    # Create migrations tracking table if it doesn't exist
    conn.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            migration_name TEXT NOT NULL UNIQUE,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()

    cursor = conn.execute("SELECT migration_name FROM schema_migrations ORDER BY id")
    return {row[0] for row in cursor.fetchall()}


def run_migrations(conn: sqlite3.Connection):
    """Run all pending migrations"""
    print("=" * 60)
    print("Running Database Migrations")
    print("=" * 60)

    applied_migrations = get_applied_migrations(conn)
    migration_files = get_migration_files()

    if not migration_files:
        print("No migration files found")
        return

    pending_migrations = [
        f for f in migration_files if f.stem not in applied_migrations and not f.stem.startswith("_")
    ]

    if not pending_migrations:
        print("✓ All migrations already applied")
        return

    print(f"Found {len(pending_migrations)} pending migration(s)\n")

    for migration_file in pending_migrations:
        migration_name = migration_file.stem

        try:
            print(f"→ Applying migration: {migration_name}")

            # Import the migration module
            module = importlib.import_module(f"app.migrations.{migration_name}")

            # Run the upgrade function
            if hasattr(module, "upgrade"):
                module.upgrade(conn)

                # Record migration as applied
                conn.execute(
                    "INSERT INTO schema_migrations (migration_name) VALUES (?)",
                    (migration_name,),
                )
                conn.commit()

                print(f"✓ Migration applied: {migration_name}\n")
            else:
                print(f"! Warning: Migration {migration_name} has no upgrade() function\n")

        except Exception as e:
            print(f"✗ Migration failed: {migration_name}")
            print(f"  Error: {e}")
            conn.rollback()
            raise

    print("=" * 60)
    print("✓ All migrations completed successfully")
    print("=" * 60)


def rollback_migration(conn: sqlite3.Connection, migration_name: str = None):
    """Rollback a specific migration or the last one"""
    print("=" * 60)
    print("Rolling Back Migration")
    print("=" * 60)

    applied_migrations = get_applied_migrations(conn)

    if not applied_migrations:
        print("No migrations to rollback")
        return

    if migration_name:
        if migration_name not in applied_migrations:
            print(f"Migration '{migration_name}' is not applied")
            return
        target_migration = migration_name
    else:
        # Get the last applied migration
        cursor = conn.execute(
            "SELECT migration_name FROM schema_migrations ORDER BY id DESC LIMIT 1"
        )
        result = cursor.fetchone()
        if not result:
            print("No migrations to rollback")
            return
        target_migration = result[0]

    try:
        print(f"→ Rolling back migration: {target_migration}")

        # Import the migration module
        module = importlib.import_module(f"app.migrations.{target_migration}")

        # Run the downgrade function
        if hasattr(module, "downgrade"):
            module.downgrade(conn)

            # Remove migration record
            conn.execute("DELETE FROM schema_migrations WHERE migration_name = ?", (target_migration,))
            conn.commit()

            print(f"✓ Migration rolled back: {target_migration}\n")
        else:
            print(f"! Warning: Migration {target_migration} has no downgrade() function\n")

    except Exception as e:
        print(f"✗ Rollback failed: {target_migration}")
        print(f"  Error: {e}")
        conn.rollback()
        raise

    print("=" * 60)
    print("✓ Rollback completed")
    print("=" * 60)
