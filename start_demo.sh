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
echo "🌐 Demo Application: http://localhost:8001"
echo ""
echo "Press Ctrl+C to stop the server"
echo "============================================================"
echo ""

# Set demo mode environment variable
export DEMO_MODE=true

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "Stopping server..."
    kill $BACKEND_PID 2>/dev/null
    exit 0
}

# Set trap to catch Ctrl+C
trap cleanup INT TERM

# Start backend on port 8001 (serves both API and static frontend)
cd "$SCRIPT_DIR/backend"
python -m uvicorn app.main:app --reload --port 8001 &
BACKEND_PID=$!
echo "✓ Server started on port 8001 (PID: $BACKEND_PID)"

echo ""
echo "Server is running. Open http://localhost:8001 in your browser."
echo ""

# Wait for the process
wait
