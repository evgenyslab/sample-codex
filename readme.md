# Audio Sample Manager

## Overview
A desktop application for managing large audio sample libraries (100k-1M samples) with tagging, collections, and intelligent organization capabilities.

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Database**: SQLite with FTS5 extension
- **File Processing**: librosa/pydub for audio metadata
- **WebSocket**: FastAPI WebSocket support

### Frontend
- **Framework**: React 18+ with TypeScript
- **State Management**: React Query + Context API
- **UI Library**: Tailwind CSS with shadcn/ui
- **Audio Playback**: Web Audio API
- **Build Tool**: Vite

## Getting Started

### Prerequisites
- Python 3.10 or higher
- Node.js 16 or higher
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sample-codex
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -e .
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

## Running the Application

### Option 1: Using the Startup Script (Recommended)
From the project root directory:
```bash
python start.py
```
This will start both the backend and frontend servers automatically.

### Option 2: Manual Start

**Terminal 1 - Backend:**
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Development

### Code Formatting

**Backend (Python):**
```bash
cd backend
# Format code with ruff
ruff format .

# Check for linting issues
ruff check .

# Auto-fix linting issues
ruff check --fix .
```

**Frontend (TypeScript/React):**
```bash
cd frontend
# Format code with Prettier (configured in .prettierrc)
npm run format

# Check formatting without making changes
npm run format:check

# Linting (configured in eslint.config.js)
npm run lint

# Auto-fix linting issues
npm run lint -- --fix
```

### Running Tests

**Backend Tests:**
```bash
cd backend
# Run all tests
pytest

# Run tests with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_samples.py

# Run with verbose output
pytest -v
```

**Frontend Tests:**
```bash
cd frontend
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- SamplePlayer.test.tsx
```

### Type Checking

**Frontend TypeScript:**
```bash
cd frontend
npm run type-check
```

## Application Features

### Core Functionality
- **Folder Scanning**: Recursively scan folders for audio files with real-time progress
- **Semantic Tagging**: Auto-generate tags from filenames and directory structure
- **Tag Management**: Create, edit, and organize tags with include/exclude filtering
- **Collections**: Create and manage sample collections (playlists)
- **Browse & Search**: Navigate by folder structure or filter by tags
- **Audio Playback**: Play samples with waveform visualization and loop controls

### Keyboard Shortcuts
- `?` - Show keyboard shortcuts
- `Esc` - Clear selection and close player
- `x` - Clear all filters (in browser view)
- `↑/↓` - Navigate samples
- `k` - Scroll to selected sample
- `Space` - Play/stop sample (when player is open)
- `l` - Toggle loop mode
- `p` - Toggle auto-play mode
- `t` - Open tag popup (when samples selected)
- `c` - Open collection popup (when samples selected)
- `f` - Reveal in folder pane (when sample selected)
- `⌘+A` - Select all samples
- `⌘+Click` - Toggle sample selection
- `Shift+Click` - Select range of samples

## Project Structure

```
sample-codex/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application entry
│   │   ├── database.py          # Database connection & models
│   │   ├── models/              # SQLAlchemy models
│   │   ├── routers/             # API route handlers
│   │   └── services/            # Business logic
│   ├── tests/                   # Backend tests
│   └── pyproject.toml           # Python dependencies & config
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   ├── contexts/            # React contexts
│   │   ├── hooks/               # Custom hooks
│   │   ├── services/            # API client
│   │   ├── types/               # TypeScript types
│   │   └── utils/               # Utility functions
│   ├── tests/                   # Frontend tests
│   ├── package.json             # npm dependencies
│   └── tsconfig.json            # TypeScript config
├── start.py                     # Application startup script
└── README.md
```

## API Documentation

Once the backend is running, you can access the interactive API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Configuration

### Backend Configuration
The backend uses environment variables and default configuration in `backend/app/config.py`:
- Database path: `./data/samples.db`
- Server host: `127.0.0.1`
- Server port: `8000`

### Frontend Configuration
Frontend configuration is in Vite config and environment variables:
- API base URL: `http://localhost:8000/api`
- WebSocket URL: `ws://localhost:8000/ws`
- Dev server port: `5173`

## Troubleshooting

### Port Already in Use
If you get a "port already in use" error:
```bash
# Kill process on port 8000 (backend)
lsof -ti:8000 | xargs kill -9

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### Database Issues
If you encounter database errors, you can reset the database by deleting the SQLite file:
```bash
rm backend/data/samples.db
```

### Frontend Build Issues
Clear node modules and reinstall:
```bash
cd frontend
rm -rf node_modules
npm install
```

## Contributing

When contributing, please ensure:
1. Code is formatted using the project's formatters (ruff for Python, Prettier for TypeScript)
2. All tests pass (`pytest` for backend, `npm test` for frontend)
3. TypeScript type checking passes (`npm run type-check`)
4. No linting errors (`ruff check` for backend, `npm run lint` for frontend)
5. Code formatting is checked (`npm run format:check` for frontend)

## License

[Add your license here]
