# Sample Codex - Unified Startup Guide

This document describes the unified entry points for running the Sample Codex application.

## Quick Start

### Development Mode (Recommended for Development)
Runs both backend and frontend dev servers concurrently:
```bash
python start.py
```

This will start:
- Backend API server on http://127.0.0.1:8000
- Frontend dev server on http://localhost:5173

### Production Mode
Builds frontend and serves it from the backend:
```bash
python start.py --prod
```

The entire application will be served from http://127.0.0.1:8000

### Individual Services

Run only the backend:
```bash
python start.py --backend
```

Run only the frontend dev server:
```bash
python start.py --frontend
```

Build frontend only:
```bash
python start.py --build
```

## Using npm Scripts

Alternative commands using the root `package.json`:

```bash
# Install all dependencies
npm run install

# Development mode (both servers)
npm run dev

# Build frontend for production
npm run build

# Start production server
npm run start

# Build and start production
npm run start:prod

# Run tests
npm run test
```

## Architecture

### Development Mode
- **Backend**: FastAPI server with hot reload at http://127.0.0.1:8000
- **Frontend**: Vite dev server with HMR at http://localhost:5173
- **Communication**: Frontend proxies API calls to backend via CORS

### Production Mode
- **Backend**: FastAPI server at http://127.0.0.1:8000
- **Frontend**: Built static files served by FastAPI from `/frontend/dist`
- **Communication**: Direct API calls to same origin
- **Routing**: Backend serves `index.html` for all non-API routes (SPA support)

## Future-Proofing

This setup is designed to support future packaging scenarios:

### 1. Docker Container
The unified entry point makes it easy to containerize:
```dockerfile
# Build frontend
RUN cd frontend && npm install && npm run build

# Start application
CMD ["python", "start.py", "--prod"]
```

### 2. Single Executable
Using tools like PyInstaller or PyOxidizer:
- Bundle the Python backend with the built frontend
- The `start.py` script handles serving static files

### 3. Electron App
Wrap the application in Electron:
- Use `start.py` to launch the backend
- Point Electron to `http://127.0.0.1:8000`

### 4. System Service
Install as a systemd service or Windows service:
```ini
[Service]
ExecStart=/usr/bin/python /path/to/sample-codex/start.py --prod
```

## Requirements

### Backend (Python 3.9+)
- fastapi
- uvicorn
- pydantic
- python-multipart
- websockets
- mutagen
- pydub

Install: `pip install -r backend/requirements.txt`

### Frontend (Node.js 18+)
- React 19
- Vite
- TanStack Query
- React Router

Install: `npm install --prefix frontend`

## Configuration

Backend configuration is in `backend/app/config.py`:
- `HOST`: Backend server host (default: 127.0.0.1)
- `PORT`: Backend server port (default: 8000)
- `FRONTEND_BUILD_DIR`: Path to built frontend (default: ../frontend/dist)

## Troubleshooting

### "Module not found" errors
```bash
pip install -r backend/requirements.txt
npm install --prefix frontend
```

### Port already in use
Edit `backend/app/config.py` to change `PORT` value.

### Frontend not loading in production
```bash
cd frontend && npm run build
```

### Both servers not starting in dev mode
Check that ports 8000 and 5173 are available.
