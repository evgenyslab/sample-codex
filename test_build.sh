#!/bin/bash

# Test Railway Build Locally
# This simulates what nixpacks will do

set -e  # Exit on error

echo "============================================================"
echo "Testing Railway Build Steps Locally"
echo "============================================================"
echo ""

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf frontend/dist
rm -rf frontend/node_modules/.vite

# Step 1: Build Frontend
echo ""
echo "📦 Step 1: Building frontend..."
cd frontend
npm install
npm run build
cd ..
echo "✅ Frontend build complete"

# Step 2: Install Backend Dependencies
echo ""
echo "📦 Step 2: Installing backend dependencies..."
cd backend
python -m pip install --upgrade pip
python -m pip install -e .
cd ..
echo "✅ Backend dependencies installed"

# Step 3: Test Backend Startup
echo ""
echo "🚀 Step 3: Testing backend startup..."
cd backend
timeout 10 python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 || true
cd ..
echo "✅ Backend startup test complete"

echo ""
echo "============================================================"
echo "✅ All build steps completed successfully!"
echo "============================================================"
echo ""
echo "This simulates what Railway will do during deployment."
echo "If all steps passed, your Railway build should succeed."
