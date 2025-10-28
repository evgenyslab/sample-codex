# Audio Sample Manager - Project Specifications

## Overview
A portable desktop application for managing large audio sample libraries (100k-1M samples) with tagging, collections, and intelligent organization capabilities.

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Database**: SQLite with FTS5 extension
- **File Processing**: librosa/pydub for audio metadata
- **Packaging**: PyInstaller or Nuitka for single executable
- **WebSocket**: FastAPI WebSocket support

### Frontend
- **Framework**: React 18+
- **State Management**: React Query + Context API
- **UI Library**: shad.cn
- **Audio Playback**: Web Audio API / Howler.js
- **Communication**: Axios for REST, native WebSocket

### Deployment
- Backend serves static React build
- Single executable for Windows/Mac/Linux
- User accesses via `http://localhost:8000`

## Application Overview

### 0. Initialization
- Backend checks for sqlite db to load, if doesn't find or can't load reports 
to front end
- Frontend loads splash page, connects to backend, requests data to load

### 1. Folder Scanning & Audio Discovery
- User selects folders via backend-served folder browser
- Recursive scan for audio files (.wav, .mp3, .flac, .aiff, .ogg)
- Extract basic metadata: duration, sample rate, format, file size
- Generate file hash (MD5) for duplicate detection
- Real-time progress updates via WebSocket
- Store file paths and metadata in SQLite

### 2. Semantic Tag Generation
- Parse filename and parent directory structure
- Extract meaningful tokens (e.g., "808_Kick_Hard.wav" → [808, Kick, Hard])
- Auto-generate tags during scan with confidence scores
- Common delimiters: underscore, hyphen, space, camelCase
- Filter stop words (the, and, a, of, etc.)
- Allow user confirmation/rejection of suggested tags

### 3. Tag Management
- Create, edit, delete tags manually
- Add/remove tags from samples
- Tag properties: name, color, auto_generated flag
- Support for tag hierarchies (future consideration)

### 4. Browse & Search
- **File Browser Mode**: Navigate original folder structure
  - Tree view of scanned folders
  - Display samples within each folder
- **Tag Browser Mode**: Filter by tags
  - AND/OR/NOT operations (e.g., Kick AND 808 NOT Acoustic)
  - Multi-tag selection
- **Search**: Full-text search on filenames and paths
  - Real-time search results
  - Combined text + tag filtering

### 5. Collections
- Create named collections (playlists/favorites)
- Add/remove samples to collections
- Reorder samples within collections
- Tag entire collections
- Browse samples by collection

### 6. Audio Playback
- Click to play selected sample
- Basic controls: play/pause/stop
- Waveform visualization (future)
- Advanced controls (future): pitch, speed, loop points

## Database Schema

### Tables

```sql
-- Core samples table
CREATE TABLE samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filepath TEXT NOT NULL UNIQUE,
    filename TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    file_size INTEGER,
    duration REAL,
    sample_rate INTEGER,
    format TEXT,
    bit_depth INTEGER,
    channels INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP,
    indexed BOOLEAN DEFAULT 0
);

-- Full-text search virtual table
CREATE VIRTUAL TABLE samples_fts USING fts5(
    filename,
    filepath,
    content=samples,
    content_rowid=id
);

-- Tags
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT,
    auto_generated BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample-Tag relationship
CREATE TABLE sample_tags (
    sample_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    confidence REAL DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (sample_id, tag_id),
    FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Scanned folders tracking
CREATE TABLE folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,
    last_scanned TIMESTAMP,
    sample_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active'
);

-- Collections
CREATE TABLE collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collection items (samples in collections)
CREATE TABLE collection_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id INTEGER NOT NULL,
    sample_id INTEGER NOT NULL,
    order_index INTEGER NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (sample_id) REFERENCES samples(id) ON DELETE CASCADE,
    UNIQUE(collection_id, sample_id)
);

-- Collection tags
CREATE TABLE collection_tags (
    collection_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (collection_id, tag_id),
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_samples_filepath ON samples(filepath);
CREATE INDEX idx_samples_filename ON samples(filename);
CREATE INDEX idx_samples_hash ON samples(file_hash);
CREATE INDEX idx_sample_tags_sample ON sample_tags(sample_id);
CREATE INDEX idx_sample_tags_tag ON sample_tags(tag_id);
CREATE INDEX idx_collection_items_collection ON collection_items(collection_id);
CREATE INDEX idx_collection_items_sample ON collection_items(sample_id);
```

## API Endpoints

### Folder Management
- `GET /api/folders/browse?path={path}` - Browse file system
- `GET /api/folders/scanned` - List all scanned folders
- `POST /api/folders/scan` - Start scanning folder(s)
- `DELETE /api/folders/{id}` - Remove folder from tracking

### Samples
- `GET /api/samples` - List samples (with pagination, filters)
- `GET /api/samples/{id}` - Get sample details
- `GET /api/samples/{id}/audio` - Stream audio file
- `PUT /api/samples/{id}` - Update sample metadata
- `DELETE /api/samples/{id}` - Delete sample record

### Tags
- `GET /api/tags` - List all tags
- `POST /api/tags` - Create new tag
- `PUT /api/tags/{id}` - Update tag
- `DELETE /api/tags/{id}` - Delete tag
- `POST /api/samples/{id}/tags` - Add tags to sample
- `DELETE /api/samples/{id}/tags/{tag_id}` - Remove tag from sample
- `POST /api/tags/suggestions/{sample_id}` - Get suggested tags for sample

### Collections
- `GET /api/collections` - List collections
- `POST /api/collections` - Create collection
- `GET /api/collections/{id}` - Get collection details
- `PUT /api/collections/{id}` - Update collection
- `DELETE /api/collections/{id}` - Delete collection
- `POST /api/collections/{id}/items` - Add sample to collection
- `DELETE /api/collections/{id}/items/{sample_id}` - Remove from collection
- `PUT /api/collections/{id}/items/reorder` - Reorder collection items

### Search
- `GET /api/search?q={query}&tags={tag_ids}&mode={and|or}` - Search samples

### WebSocket
- `WS /ws/scan` - Real-time scan progress updates

## Frontend Structure

### Pages/Views
1. **Dashboard** - Overview, recent collections, stats
2. **Browser** - Folder tree + sample list + preview panel
3. **Tag Browser** - Tag cloud/list + filtered results
4. **Collections** - Collection list + collection detail view
5. **Search** - Search interface with advanced filters
6. **Settings** - App configuration, folder management

### Key Components
- `FolderTree` - Hierarchical folder navigation
- `SampleGrid/List` - Display samples with thumbnails
- `SamplePlayer` - Audio playback controls
- `TagSelector` - Multi-select tag interface
- `CollectionManager` - Create/edit collections
- `SearchBar` - Search with autocomplete
- `ScanProgress` - Real-time scan status

## Performance Considerations

### Scanning Optimization
- Batch database inserts (1000 records at a time)
- Parallel file processing with thread pool
- Progress updates every 100 files (not every file)
- Skip already indexed files (hash comparison)

### Query Optimization
- Pagination for large result sets (100 items/page)
- Lazy loading for folder trees
- Cache frequently accessed data
- Use prepared statements
- Virtual scrolling for long lists

### File Serving
- Stream large audio files (chunked transfer)
- Cache file metadata in memory
- Consider content delivery for repeated requests

## Semantic Tagging Algorithm

### Parsing Rules (v1)
1. Split filename by: `_`, `-`, ` `, `.`, camelCase
2. Split parent directories into tokens
3. Remove file extension and common suffixes
4. Filter stop words: [the, and, a, of, by, for, with, from, in, at]
5. Normalize: lowercase, trim whitespace
6. Remove numbers < 3 digits (unless part of known pattern like "808")
7. Assign confidence scores:
   - Filename tokens: 1.0
   - Parent directory: 0.8
   - Grandparent directory: 0.6

### Example
```
Path: /Samples/Drums/Kick/808_Kick_Hard_C.wav
Tokens: [Samples, Drums, Kick, 808, Hard, C]
Filtered: [Drums, Kick, 808, Hard, C]
Tags generated:
  - Drums (confidence: 0.8)
  - Kick (confidence: 1.0)
  - 808 (confidence: 1.0)
  - Hard (confidence: 1.0)
  - C (confidence: 1.0)
```

## Development Phases

### Phase 1: Core Functionality (MVP)
- [ ] Backend API setup with FastAPI
- [ ] SQLite database initialization
- [ ] Folder browsing API
- [ ] Scanning functionality with progress
- [ ] Basic semantic tagging
- [ ] Sample CRUD operations
- [ ] Tag CRUD operations
- [ ] React frontend scaffolding
- [ ] Folder browser UI
- [ ] Sample list/grid view
- [ ] Tag management UI
- [ ] Basic audio playback

### Phase 2: Enhanced Features
- [ ] Collections functionality
- [ ] Advanced search with filters
- [ ] Tag browser with AND/OR/NOT
- [ ] Batch operations (tag multiple samples)
- [ ] Export/import collections
- [ ] Keyboard shortcuts
- [ ] Drag & drop support

### Phase 3: Polish & Optimization
- [ ] Waveform visualization
- [ ] Advanced playback controls
- [ ] Performance profiling & optimization
- [ ] Packaging as standalone executable
- [ ] User preferences/settings
- [ ] Dark/light theme
- [ ] Documentation

### Phase 4: Advanced Features (Future)
- [ ] Audio metadata extraction (BPM, key, etc.)
- [ ] Machine learning for better tagging
- [ ] Plugin system for custom processors
- [ ] Cloud sync capabilities
- [ ] Collaborative features

## File Structure

```
audio-sample-manager/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app entry
│   │   ├── config.py            # Configuration
│   │   ├── database.py          # DB connection & models
│   │   ├── models/              # SQLAlchemy models
│   │   ├── routers/             # API route handlers
│   │   │   ├── folders.py
│   │   │   ├── samples.py
│   │   │   ├── tags.py
│   │   │   ├── collections.py
│   │   │   └── search.py
│   │   ├── services/            # Business logic
│   │   │   ├── scanner.py
│   │   │   ├── tagger.py
│   │   │   ├── audio.py
│   │   │   └── search.py
│   │   └── utils/               # Helper functions
│   ├── tests/
│   ├── requirements.txt
│   └── run.py                   # Development server
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/            # API client
│   │   ├── hooks/               # Custom React hooks
│   │   ├── contexts/            # React contexts
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── docs/
├── scripts/                     # Build & packaging scripts
├── README.md
└── .gitignore
```

## Configuration

### Backend Config (config.py)
```python
DATABASE_PATH = "./data/samples.db"
AUDIO_FORMATS = [".wav", ".mp3", ".flac", ".aiff", ".ogg", ".m4a"]
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB
SCAN_BATCH_SIZE = 1000
HOST = "127.0.0.1"
PORT = 8000
```

### Frontend Config
```javascript
API_BASE_URL = "http://localhost:8000/api"
WS_URL = "ws://localhost:8000/ws"
ITEMS_PER_PAGE = 100
```

## Testing Strategy
- Backend: pytest with test database
- Frontend: React Testing Library + Vitest
- Integration tests for scan workflow
- Performance tests for large libraries
- End-to-end tests with Playwright (optional)

## Security Considerations
- Validate all file paths (prevent directory traversal)
- Limit file system access to user-selected folders
- Sanitize filenames and tags
- Rate limit API endpoints
- CORS configuration for localhost only

## Future Considerations
- Multi-user support
- Remote library access
- Audio analysis (ML-based tagging)
- VST plugin integration
- DAW integration
- Mobile app companion