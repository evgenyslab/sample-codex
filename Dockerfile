# FOR RAILWAY DEMO ONLY
# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy backend requirements and install Python dependencies
COPY backend/ ./backend/
COPY pyproject.toml ./

# Install Python dependencies
RUN pip install --no-cache-dir -e .

# Copy pre-built frontend
COPY frontend/demo-dist/ ./frontend/demo-dist/

# Expose port (Railway will set PORT env var)
EXPOSE 8000

# Set environment variable for demo mode
ENV DEMO_MODE=true

# Start command
CMD cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
