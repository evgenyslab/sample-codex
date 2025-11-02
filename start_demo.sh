#!/bin/bash

# Demo Mode Startup Script for Sample Codex
# This script runs the application in pure demo mode with session-based databases

echo "============================================================"
echo "Starting Sample Codex in DEMO MODE"
echo "============================================================"
echo ""
echo "Demo Mode Features:"
echo "  ✓ Each user gets their own isolated database"
echo "  ✓ Demo audio files pre-loaded automatically"
echo "  ✓ Sessions timeout after 1 hour of inactivity"
echo "  ✓ Max 100 concurrent sessions (LRU eviction)"
echo "  ✓ Folder scanning disabled"
echo ""
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "============================================================"
echo ""

# Set demo mode environment variable
export DEMO_MODE=true

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set trap to catch Ctrl+C
trap cleanup INT TERM

# Start backend in background
cd "$SCRIPT_DIR/backend"
python -m uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"

# Start frontend in background
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "Both servers are running. Press Ctrl+C to stop."
echo ""

# Wait for both processes
wait
