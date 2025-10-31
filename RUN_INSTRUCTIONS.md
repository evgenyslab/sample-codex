# Audio Sample Manager - Run Instructions

This project consists of a **FastAPI backend** and a **React (Vite) frontend** with Tailwind CSS styling.

## Project Structure

```
sample-codex/
├── backend/              # FastAPI Python backend
│   ├── app/
│   │   ├── routers/     # API endpoints
│   │   ├── database.py  # SQLite database management
│   │   ├── config.py    # Configuration
│   │   └── main.py      # FastAPI app
│   ├── requirements.txt
│   └── run.py           # Development server
├── frontend/             # React + Vite frontend
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── services/    # API client
│   │   └── App.jsx      # Main app
│   ├── package.json
│   └── vite.config.js
└── RUN_INSTRUCTIONS.md
```

## Prerequisites

- **Python 3.10+** (for backend)
- **Node.js 18+** and **npm** (for frontend)

## Backend Setup

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

Or with a virtual environment (recommended):

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Run the Backend

```bash
python run.py
```

The backend will start at **http://localhost:8000**

- API Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/api/health

The database (`data/samples.db`) will be created automatically on first run.

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

The frontend will start at **http://localhost:5173**

### 3. Build for Production

```bash
npm run build
```

The build output will be in `frontend/dist/`

## Running the Full Application

### Quick Start (Unified Entry Point) ⭐

The easiest way to run the application is using the unified entry point:

**Development Mode (Both Servers):**
```bash
python start.py
```
This starts both backend (http://127.0.0.1:8000) and frontend (http://localhost:5173) automatically.

**Production Mode:**
```bash
python start.py --prod
```
This builds the frontend and serves everything from http://127.0.0.1:8000

**Other Options:**
```bash
python start.py --backend   # Backend only
python start.py --frontend  # Frontend only
python start.py --build     # Build frontend
./start.sh                  # Unix/Mac convenience script
```

See [STARTUP.md](STARTUP.md) for detailed documentation.

### Alternative: Manual Setup

If you prefer to run servers manually in separate terminals:

**Terminal 1 - Backend:**
```bash
cd backend
python run.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.

## API Endpoints

### Folders
- `GET /api/folders/browse?path={path}` - Browse filesystem
- `GET /api/folders/scanned` - List scanned folders
- `POST /api/folders/scan` - Start folder scan
- `DELETE /api/folders/{id}` - Remove folder

### Samples
- `GET /api/samples` - List samples (with pagination)
- `GET /api/samples/{id}` - Get sample details
- `GET /api/samples/{id}/audio` - Stream audio file
- `PUT /api/samples/{id}` - Update sample
- `DELETE /api/samples/{id}` - Delete sample

### Tags
- `GET /api/tags` - List all tags
- `POST /api/tags` - Create tag
- `PUT /api/tags/{id}` - Update tag
- `DELETE /api/tags/{id}` - Delete tag
- `POST /tags/samples/{id}/tags` - Add tags to sample
- `DELETE /tags/samples/{id}/tags/{tag_id}` - Remove tag from sample

### Collections
- `GET /api/collections` - List collections
- `POST /api/collections` - Create collection
- `GET /api/collections/{id}` - Get collection details
- `PUT /api/collections/{id}` - Update collection
- `DELETE /api/collections/{id}` - Delete collection
- `POST /api/collections/{id}/items` - Add item to collection
- `DELETE /api/collections/{id}/items/{sample_id}` - Remove item

### Search
- `GET /api/search?q={query}&tags={tag_ids}&mode={and|or}` - Search samples

## Configuration

### Backend (`backend/app/config.py`)

```python
HOST = "127.0.0.1"
PORT = 8000
DATABASE_PATH = "./data/samples.db"
AUDIO_FORMATS = [".wav", ".mp3", ".flac", ".aiff", ".ogg", ".m4a"]
```

### Frontend (`frontend/.env`)

```
VITE_API_URL=http://localhost:8000/api
```

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLite** with FTS5 - Database with full-text search
- **Pydantic** - Data validation
- **Uvicorn** - ASGI server

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Tanstack Query (React Query)** - Data fetching and caching
- **Axios** - HTTP client

## Troubleshooting

### Backend Issues

**Database locked error:**
- Ensure only one backend instance is running
- Delete `backend/data/samples.db` and restart

**Import errors:**
- Verify Python 3.10+ is installed: `python --version`
- Reinstall dependencies: `pip install -r requirements.txt`

### Frontend Issues

**Port already in use:**
- Change the dev server port in `frontend/vite.config.js`
- Or kill the process using port 5173

**Build errors:**
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`

**Cannot connect to backend:**
- Verify backend is running at http://localhost:8000
- Check `frontend/.env` has correct API URL
- Check browser console for CORS errors

## Next Steps

1. **Add Sample Scanning**: Implement the backend scanner service to crawl directories and index audio files
2. **Audio Playback**: Add Web Audio API integration for in-browser playback
3. **Tag UI**: Create tag management interface with color coding
4. **Collections UI**: Build collection creation and management views
5. **Search UI**: Implement advanced search with filters
6. **File Browser**: Add folder tree navigation component

## License

See LICENSE file in the root directory.
