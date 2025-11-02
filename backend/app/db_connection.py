"""Database connection helper - works with both demo and production mode"""

import os

DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"

if DEMO_MODE:
    from app.demo.database import demo_db as _db
else:
    from app.database import db as _db


def get_db_connection(request=None):
    """
    Get database connection with session support for demo mode

    Args:
        request: FastAPI Request object (needed for demo mode session ID)

    Returns:
        sqlite3.Connection
    """
    if DEMO_MODE and request and hasattr(request.state, "session_id"):
        return _db.get_connection(session_id=request.state.session_id)
    if DEMO_MODE:
        return _db.get_connection(session_id="default")
    return _db.get_connection()


# For backwards compatibility
db = _db
