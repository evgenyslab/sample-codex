"""Session-based database manager for demo mode with security controls"""

import logging
import sqlite3
import time
from collections import OrderedDict
from typing import Dict, Optional

from app.demo.generator import generate_demo_database

logger = logging.getLogger(__name__)

# Configuration
MAX_SESSIONS = 100  # Maximum concurrent sessions
SESSION_TIMEOUT = 3600  # 1 hour in seconds
CLEANUP_INTERVAL = 300  # Run cleanup every 5 minutes


class DemoSessionDatabase:
    """
    Manages per-session in-memory databases for demo mode

    Features:
    - LRU eviction when max sessions reached
    - Automatic cleanup of stale sessions
    - Memory-efficient session tracking
    """

    def __init__(self, max_sessions: int = MAX_SESSIONS, session_timeout: int = SESSION_TIMEOUT):
        self.max_sessions = max_sessions
        self.session_timeout = session_timeout
        self.sessions: OrderedDict[str, Dict] = OrderedDict()
        self.last_cleanup = time.time()

        logger.info(f"Demo database manager initialized (max_sessions={max_sessions}, timeout={session_timeout}s)")

    def get_connection(self, session_id: str = "default", **kwargs) -> sqlite3.Connection:
        """
        Get or create a database connection for the given session

        Args:
            session_id: Unique session identifier

        Returns:
            sqlite3.Connection for this session
        """
        # Periodic cleanup
        self._maybe_cleanup()

        # Check if session exists
        if session_id in self.sessions:
            session_data = self.sessions[session_id]
            session_data["last_access"] = time.time()
            session_data["access_count"] += 1

            # Move to end (most recently used)
            self.sessions.move_to_end(session_id)

            logger.debug(f"Session {session_id[:8]}... accessed (count={session_data['access_count']})")
            return session_data["conn"]

        # Create new session
        logger.info(f"Creating new demo session: {session_id[:8]}...")

        # Check if we need to evict old sessions
        if len(self.sessions) >= self.max_sessions:
            self._evict_lru_session()

        # Generate new demo database
        conn = generate_demo_database(":memory:")

        session_data = {
            "conn": conn,
            "created_at": time.time(),
            "last_access": time.time(),
            "access_count": 1,
        }

        self.sessions[session_id] = session_data
        logger.info(f"Demo session created: {session_id[:8]}... (total sessions: {len(self.sessions)})")

        return conn

    def check_health(self) -> bool:
        """Check if the demo database system is healthy"""
        try:
            # Just verify we can create a session
            if not self.sessions:
                test_conn = generate_demo_database(":memory:")
                test_conn.execute("SELECT 1").fetchone()
                test_conn.close()
            return True
        except Exception as e:
            logger.error(f"Demo database health check failed: {e}")
            return False

    def _evict_lru_session(self):
        """Evict the least recently used session"""
        if not self.sessions:
            return

        # OrderedDict maintains insertion order, first item is LRU
        lru_session_id, lru_data = self.sessions.popitem(last=False)

        # Close connection
        try:
            lru_data["conn"].close()
        except Exception as e:
            logger.warning(f"Error closing evicted session: {e}")

        logger.info(f"Evicted LRU session {lru_session_id[:8]}... (age={time.time() - lru_data['created_at']:.0f}s)")

    def _maybe_cleanup(self):
        """
        Periodically clean up stale sessions

        Runs every CLEANUP_INTERVAL seconds
        """
        now = time.time()

        if now - self.last_cleanup < CLEANUP_INTERVAL:
            return

        self.last_cleanup = now
        self._cleanup_stale_sessions()

    def _cleanup_stale_sessions(self):
        """Remove sessions that haven't been accessed in SESSION_TIMEOUT"""
        now = time.time()
        stale_sessions = []

        for session_id, session_data in self.sessions.items():
            age = now - session_data["last_access"]
            if age > self.session_timeout:
                stale_sessions.append(session_id)

        for session_id in stale_sessions:
            session_data = self.sessions.pop(session_id)
            try:
                session_data["conn"].close()
            except Exception as e:
                logger.warning(f"Error closing stale session: {e}")

            logger.info(f"Cleaned up stale session {session_id[:8]}... (idle for {self.session_timeout}s)")

        if stale_sessions:
            logger.info(f"Cleanup complete: removed {len(stale_sessions)} stale sessions, {len(self.sessions)} active")

    def get_stats(self) -> Dict:
        """Get current statistics about demo sessions"""
        return {
            "active_sessions": len(self.sessions),
            "max_sessions": self.max_sessions,
            "total_accesses": sum(s["access_count"] for s in self.sessions.values()),
        }

    def clear_all_data(self) -> bool:
        """Clear all demo sessions (for admin use)"""
        for session_data in self.sessions.values():
            try:
                session_data["conn"].close()
            except:
                pass

        self.sessions.clear()
        logger.info("All demo sessions cleared")
        return True


# Global instance
demo_db = DemoSessionDatabase()
