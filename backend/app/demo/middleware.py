"""Session management middleware for demo mode"""

import logging
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger(__name__)


class DemoSessionMiddleware(BaseHTTPMiddleware):
    """
    Adds session_id to request state for demo mode

    Uses cookies to maintain session across requests
    """

    async def dispatch(self, request: Request, call_next):
        # Get or create session ID
        session_id = request.cookies.get("demo_session_id")

        if not session_id:
            session_id = str(uuid.uuid4())
            logger.info(f"New demo session created: {session_id[:8]}...")

        # Add to request state
        request.state.session_id = session_id

        # Process request
        response = await call_next(request)

        # Set cookie if new session
        if not request.cookies.get("demo_session_id"):
            response.set_cookie(
                key="demo_session_id",
                value=session_id,
                max_age=3600,  # 1 hour
                httponly=True,
                samesite="lax"
            )

        return response
