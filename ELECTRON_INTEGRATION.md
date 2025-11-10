# Electron Integration Plan for Sample Codex

## Overview

This document outlines the plan to convert the Sample Codex application (FastAPI backend + React frontend) into a standalone Electron desktop application. The goal is to create a native desktop experience that bundles both the Python backend and React frontend into a single distributable application.

## Table of Contents

- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Implementation Phases](#implementation-phases)
- [Development Workflow](#development-workflow)
- [Build & Distribution](#build--distribution)
- [Testing Strategy](#testing-strategy)
- [Implementation Timeline](#implementation-timeline)
- [Platform-Specific Considerations](#platform-specific-considerations)

## Architecture

### Current Structure

```
sample-codex/
├── backend/          # FastAPI Python server
│   ├── app/
│   │   ├── routers/
│   │   ├── services/
│   │   └── database.py
│   └── main.py
└── frontend/         # React + Vite
    ├── src/
    ├── package.json
    └── vite.config.ts
```

### Proposed Electron Structure

```
sample-codex/
├── backend/          # FastAPI Python server (unchanged)
│   ├── app/
│   ├── main.py
│   └── app.spec      # PyInstaller configuration (NEW)
│
├── frontend/         # React + Vite (unchanged)
│   ├── src/
│   └── package.json
│
└── electron/         # NEW: Electron wrapper
    ├── main/         # Electron main process
    │   ├── index.ts            # Entry point
    │   ├── backend-manager.ts  # Python backend lifecycle
    │   ├── window-manager.ts   # Window creation
    │   └── menu.ts             # App menu
    │
    ├── preload/      # Preload scripts
    │   └── index.ts            # Bridge between main and renderer
    │
    ├── resources/    # App resources
    │   ├── icon.png
    │   ├── icon.icns           # macOS icon
    │   ├── icon.ico            # Windows icon
    │   └── entitlements.mac.plist
    │
    ├── package.json
    ├── tsconfig.json
    └── electron-builder.yml    # Build configuration
```

### Architecture Diagram

```
┌─────────────────────────────────────────┐
│         Electron Application            │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │     Renderer Process (React)      │ │
│  │   - Frontend UI                   │ │
│  │   - Runs in sandboxed webview     │ │
│  └───────────────┬───────────────────┘ │
│                  │ IPC                  │
│  ┌───────────────▼───────────────────┐ │
│  │     Main Process (Node.js)        │ │
│  │   - Window management             │ │
│  │   - Backend lifecycle             │ │
│  │   - File system access            │ │
│  └───────────────┬───────────────────┘ │
│                  │ spawn                │
│  ┌───────────────▼───────────────────┐ │
│  │   Python Backend (FastAPI)        │ │
│  │   - Bundled executable            │ │
│  │   - Runs on localhost:8000        │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Electron Infrastructure Setup

#### 1.1 Create Electron Project

```bash
cd sample-codex
mkdir -p electron/{main,preload,resources}
cd electron
npm init -y
```

#### 1.2 Install Dependencies

```bash
npm install --save-dev \
  electron \
  electron-builder \
  typescript \
  @types/node \
  concurrently

npm install \
  electron-store \
  fix-path
```

#### 1.3 Package.json Configuration

```json
{
  "name": "sample-codex-electron",
  "version": "1.0.0",
  "description": "Audio Sample Manager Desktop Application",
  "main": "dist/main/index.js",
  "author": "Your Name",
  "license": "MIT",
  "scripts": {
    "dev": "concurrently \"npm run dev:main\" \"npm run dev:renderer\" \"npm run dev:backend\"",
    "dev:main": "tsc && electron .",
    "dev:renderer": "cd ../frontend && npm run dev",
    "dev:backend": "cd ../backend && python main.py",
    "build": "npm run build:main && npm run build:renderer && npm run build:backend",
    "build:main": "tsc",
    "build:renderer": "cd ../frontend && npm run build",
    "build:backend": "cd ../backend && pyinstaller app.spec",
    "package": "electron-builder",
    "package:mac": "electron-builder --mac",
    "package:win": "electron-builder --win",
    "package:linux": "electron-builder --linux",
    "package:all": "electron-builder -mwl"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "concurrently": "^8.0.0",
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0",
    "typescript": "^5.0.0"
  },
  "dependencies": {
    "electron-store": "^8.0.0",
    "fix-path": "^4.0.0"
  }
}
```

### Phase 2: Main Process Implementation

#### 2.1 Backend Manager (`electron/main/backend-manager.ts`)

Manages the Python backend lifecycle (starting, stopping, health checks).

```typescript
import { spawn, ChildProcess } from 'child_process';
import { app } from 'electron';
import path from 'path';
import fixPath from 'fix-path';

export class BackendManager {
  private process: ChildProcess | null = null;
  private port: number = 8000;

  constructor() {
    // Fix PATH issues on macOS
    fixPath();
  }

  async start(): Promise<void> {
    const isDev = !app.isPackaged;

    if (isDev) {
      // Development: Run Python directly
      return this.startDev();
    } else {
      // Production: Run bundled executable
      return this.startProd();
    }
  }

  private async startDev(): Promise<void> {
    const backendPath = path.join(__dirname, '../../../backend');

    this.process = spawn('python', ['main.py'], {
      cwd: backendPath,
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    this.process.stdout?.on('data', (data) => {
      console.log(`Backend: ${data}`);
    });

    this.process.stderr?.on('data', (data) => {
      console.error(`Backend Error: ${data}`);
    });

    // Wait for backend to be ready
    await this.waitForBackend();
  }

  private async startProd(): Promise<void> {
    const backendExe = process.platform === 'win32'
      ? 'backend.exe'
      : 'backend';

    const backendPath = path.join(
      process.resourcesPath,
      'backend',
      backendExe
    );

    this.process = spawn(backendPath, [], {
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    this.process.stdout?.on('data', (data) => {
      console.log(`Backend: ${data}`);
    });

    await this.waitForBackend();
  }

  private async waitForBackend(timeout = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`http://localhost:${this.port}/api/health`);
        if (response.ok) {
          console.log('Backend is ready');
          return;
        }
      } catch (e) {
        // Backend not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error('Backend failed to start');
  }

  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  getUrl(): string {
    return `http://localhost:${this.port}`;
  }
}
```

#### 2.2 Window Manager (`electron/main/window-manager.ts`)

Handles window creation and lifecycle.

```typescript
import { BrowserWindow, app } from 'electron';
import path from 'path';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;

  createWindow(backendUrl: string): void {
    const isDev = !app.isPackaged;

    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      },
      titleBarStyle: 'hiddenInset', // macOS style
      show: false // Show after ready-to-show
    });

    // Load app
    if (isDev) {
      // Development: Load from Vite dev server
      this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      // Production: Load from built files
      this.mainWindow.loadFile(
        path.join(__dirname, '../../renderer/index.html')
      );
    }

    // Inject backend URL into renderer
    this.mainWindow.webContents.on('did-finish-load', () => {
      this.mainWindow?.webContents.send('backend-url', backendUrl);
    });

    // Show when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // Handle window close
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  getWindow(): BrowserWindow | null {
    return this.mainWindow;
  }
}
```

#### 2.3 Main Entry Point (`electron/main/index.ts`)

Application entry point and lifecycle management.

```typescript
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { BackendManager } from './backend-manager';
import { WindowManager } from './window-manager';
import { createMenu } from './menu';

let backendManager: BackendManager;
let windowManager: WindowManager;

async function initialize() {
  // Start backend
  backendManager = new BackendManager();
  await backendManager.start();

  // Create window
  windowManager = new WindowManager();
  windowManager.createWindow(backendManager.getUrl());

  // Create menu
  createMenu();
}

// App lifecycle
app.on('ready', async () => {
  try {
    await initialize();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    dialog.showErrorBox(
      'Startup Error',
      `Failed to start application: ${error}`
    );
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager.createWindow(backendManager.getUrl());
  }
});

app.on('before-quit', () => {
  backendManager.stop();
});

// IPC handlers
ipcMain.handle('get-backend-url', () => {
  return backendManager.getUrl();
});

ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Database', extensions: ['db'] }]
  });
  return result.filePaths[0];
});

ipcMain.handle('open-folder-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});
```

#### 2.4 Application Menu (`electron/main/menu.ts`)

Native application menu.

```typescript
import { Menu, shell, app } from 'electron';

export function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://github.com/yourusername/sample-codex')
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
```

### Phase 3: Preload Script

#### 3.1 Preload Bridge (`electron/preload/index.ts`)

Secure bridge between main and renderer processes.

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  onBackendUrl: (callback: (url: string) => void) => {
    ipcRenderer.on('backend-url', (_event, url) => callback(url));
  }
});
```

### Phase 4: Frontend Integration

#### 4.1 TypeScript Definitions (`frontend/src/electron.d.ts`)

```typescript
export interface ElectronAPI {
  getBackendUrl: () => Promise<string>;
  openFileDialog: () => Promise<string | undefined>;
  openFolderDialog: () => Promise<string | undefined>;
  onBackendUrl: (callback: (url: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
```

#### 4.2 Update API Service (`frontend/src/services/api.ts`)

Add Electron detection and dynamic API URL.

```typescript
// Detect if running in Electron
const isElectron = (): boolean => {
  return window.electronAPI !== undefined;
};

// Get API base URL
const getApiBaseUrl = async (): Promise<string> => {
  if (isElectron()) {
    const backendUrl = await window.electronAPI!.getBackendUrl();
    return `${backendUrl}/api`;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
};

// Initialize API base URL
let API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Update base URL if running in Electron
if (isElectron()) {
  getApiBaseUrl().then(url => {
    API_BASE_URL = url;
    api.defaults.baseURL = url;
  });
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export { isElectron };
```

#### 4.3 Use Electron File Dialogs

Update components that use file/folder selection to use Electron dialogs when available:

```typescript
// In FolderBrowserModal or similar components
const handleSelectFolder = async () => {
  if (window.electronAPI) {
    // Use Electron file dialog
    const path = await window.electronAPI.openFolderDialog();
    if (path) {
      // Handle selected path
    }
  } else {
    // Fall back to web file input
    // ...existing code...
  }
};
```

### Phase 5: Backend Packaging with PyInstaller

#### 5.1 Install PyInstaller

```bash
cd backend
pip install pyinstaller
```

#### 5.2 Create PyInstaller Spec (`backend/app.spec`)

```python
# -*- mode: python ; coding: utf-8 -*-

import sys
from pathlib import Path

# Get the absolute path to the backend directory
backend_path = Path.cwd()

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=[str(backend_path)],
    binaries=[],
    datas=[
        ('app', 'app'),  # Include entire app directory
    ],
    hiddenimports=[
        'fastapi',
        'uvicorn',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'pydantic',
        'pydantic.fields',
        'sqlite3',
        'mutagen',
        'mutagen.mp3',
        'mutagen.wave',
        'mutagen.flac',
        'mutagen.aiff',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'numpy',
        'pandas',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False if sys.platform == 'darwin' else True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
```

#### 5.3 Build Backend

```bash
cd backend
pyinstaller app.spec
# Output: backend/dist/backend (or backend.exe on Windows)
```

### Phase 6: Electron Builder Configuration

#### 6.1 Configuration File (`electron/electron-builder.yml`)

```yaml
appId: com.yourcompany.samplecodex
productName: Sample Codex
copyright: Copyright © 2024 Your Company

directories:
  buildResources: resources
  output: dist

files:
  - dist/**/*
  - package.json

extraResources:
  - from: ../backend/dist/backend${env.EXEC_EXT}
    to: backend
    filter:
      - "**/*"
  - from: ../frontend/dist
    to: renderer
    filter:
      - "**/*"

mac:
  category: public.app-category.music
  target:
    - dmg
    - zip
  icon: resources/icon.icns
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: resources/entitlements.mac.plist
  entitlementsInherit: resources/entitlements.mac.plist
  darkModeSupport: true

win:
  target:
    - nsis
    - portable
  icon: resources/icon.ico
  publisherName: Your Company

linux:
  target:
    - AppImage
    - deb
  category: Audio
  icon: resources/icon.png
  maintainer: your-email@example.com

nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true

dmg:
  title: ${productName} ${version}
  icon: resources/icon.icns
  background: resources/dmg-background.png
  window:
    width: 540
    height: 380
  contents:
    - x: 144
      y: 150
      type: file
    - x: 396
      y: 150
      type: link
      path: /Applications

publish:
  provider: github
  owner: yourusername
  repo: sample-codex
```

#### 6.2 TypeScript Configuration (`electron/tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": [
    "main/**/*",
    "preload/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

#### 6.3 macOS Entitlements (`electron/resources/entitlements.mac.plist`)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
  </dict>
</plist>
```

## Development Workflow

### Running in Development Mode

#### Option 1: Separate Terminals (Recommended for debugging)

```bash
# Terminal 1: Backend
cd backend
python main.py

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Electron
cd electron
npm run dev:main
```

#### Option 2: Single Command (Quick start)

```bash
cd electron
npm run dev
```

This runs all three processes using `concurrently`.

### Hot Reload Behavior

- **Frontend**: Vite provides instant hot module replacement
- **Backend**: Manual restart required for Python changes (or use `watchdog`)
- **Electron Main**: Requires restart (`Ctrl+C` and `npm run dev:main`)

### Debugging

#### Frontend (Chrome DevTools)
- Opens automatically in dev mode
- `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (macOS)

#### Main Process (VS Code)
Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Electron Main",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/electron",
      "runtimeExecutable": "${workspaceFolder}/electron/node_modules/.bin/electron",
      "args": ["."],
      "outputCapture": "std"
    }
  ]
}
```

#### Backend (Python)
Use standard Python debugging tools or VS Code Python extension.

## Build & Distribution

### Complete Build Process

#### Step 1: Install Dependencies

```bash
# Backend
cd backend
pip install -r requirements.txt
pip install pyinstaller

# Frontend
cd ../frontend
npm install

# Electron
cd ../electron
npm install
```

#### Step 2: Build All Components

```bash
# From electron directory
cd electron
npm run build
```

This runs:
1. `build:backend` - Creates Python executable
2. `build:renderer` - Builds React app
3. `build:main` - Compiles TypeScript

#### Step 3: Package Application

```bash
# From electron directory

# macOS
npm run package:mac

# Windows (from Windows or with wine)
npm run package:win

# Linux
npm run package:linux

# All platforms (requires all platform dependencies)
npm run package:all
```

### Output Artifacts

#### macOS
- `electron/dist/Sample Codex-1.0.0.dmg` - Installer image
- `electron/dist/Sample Codex-1.0.0-mac.zip` - Compressed app bundle
- `electron/dist/mac/Sample Codex.app` - Application bundle

#### Windows
- `electron/dist/Sample Codex Setup 1.0.0.exe` - NSIS installer
- `electron/dist/Sample Codex 1.0.0.exe` - Portable executable

#### Linux
- `electron/dist/Sample Codex-1.0.0.AppImage` - Universal Linux package
- `electron/dist/sample-codex_1.0.0_amd64.deb` - Debian package

### Code Signing

#### macOS

1. **Get Developer Certificate**
   - Apple Developer account required
   - Download certificates from Apple Developer portal

2. **Configure Signing**
   ```bash
   # Set environment variables
   export APPLE_ID="your-apple-id@email.com"
   export APPLE_ID_PASSWORD="app-specific-password"
   export APPLE_TEAM_ID="your-team-id"
   ```

3. **Sign and Notarize**
   ```bash
   npm run package:mac
   # Electron Builder handles signing and notarization
   ```

#### Windows

1. **Get Code Signing Certificate**
   - Purchase from certificate authority (Sectigo, DigiCert, etc.)

2. **Configure Signing**
   ```yaml
   # In electron-builder.yml
   win:
     certificateFile: path/to/certificate.pfx
     certificatePassword: ${env.WINDOWS_CERT_PASSWORD}
   ```

### CI/CD Pipeline

#### GitHub Actions (`.github/workflows/build.yml`)

```yaml
name: Build & Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install Python dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pyinstaller

      - name: Build backend
        run: |
          cd backend
          pyinstaller app.spec

      - name: Install frontend dependencies
        run: |
          cd frontend
          npm ci

      - name: Build frontend
        run: |
          cd frontend
          npm run build

      - name: Install Electron dependencies
        run: |
          cd electron
          npm ci

      - name: Build Electron app
        run: |
          cd electron
          npm run build

      - name: Package app
        run: |
          cd electron
          npm run package
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-build
          path: electron/dist/*

  release:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v3

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            **/*.dmg
            **/*.zip
            **/*.exe
            **/*.AppImage
            **/*.deb
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Testing Strategy

### Manual Testing Checklist

#### Development Mode
- [ ] Backend starts successfully
- [ ] Frontend loads without errors
- [ ] Electron window opens
- [ ] Hot reload works for frontend
- [ ] Database operations work
- [ ] File dialogs open correctly

#### Production Build
- [ ] Application launches
- [ ] Backend starts automatically
- [ ] All features work correctly
- [ ] No console errors
- [ ] Database file is created/loaded
- [ ] Audio playback works
- [ ] Scan functionality works

#### Platform-Specific
- [ ] macOS: DMG installer works
- [ ] macOS: Gatekeeper doesn't block
- [ ] Windows: Installer works
- [ ] Windows: No UAC issues
- [ ] Linux: AppImage runs
- [ ] Linux: DEB installs correctly

### Automated Testing

#### Unit Tests for Main Process

```typescript
// electron/main/__tests__/backend-manager.test.ts
import { BackendManager } from '../backend-manager';

describe('BackendManager', () => {
  let manager: BackendManager;

  beforeEach(() => {
    manager = new BackendManager();
  });

  afterEach(() => {
    manager.stop();
  });

  it('should start backend in development mode', async () => {
    await manager.start();
    expect(manager.getUrl()).toBe('http://localhost:8000');
  });

  // More tests...
});
```

#### E2E Tests with Playwright

```typescript
// electron/e2e/app.spec.ts
import { test, expect, _electron as electron } from '@playwright/test';

test('application launches', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  // Check title
  await expect(window).toHaveTitle('Sample Codex');

  // Check that main elements are visible
  await expect(window.locator('.sidebar')).toBeVisible();

  await app.close();
});
```

## Implementation Timeline

### Week 1: Infrastructure Setup
- **Day 1-2**: Create Electron project structure
- **Day 3-4**: Implement backend manager and window manager
- **Day 5**: Set up preload script and IPC communication

### Week 2: Integration
- **Day 1-2**: Integrate frontend with Electron APIs
- **Day 3**: Update file dialogs and native features
- **Day 4-5**: Development workflow setup and testing

### Week 3: Backend Packaging
- **Day 1-2**: Configure PyInstaller
- **Day 3-4**: Test backend bundling on all platforms
- **Day 5**: Handle resource paths and data files

### Week 4: Build & Distribution
- **Day 1-2**: Configure Electron Builder
- **Day 3**: Test builds on all platforms
- **Day 4**: Set up code signing
- **Day 5**: Create CI/CD pipeline

### Week 5: Polish & Testing
- **Day 1-2**: Manual testing on all platforms
- **Day 3-4**: Fix bugs and edge cases
- **Day 5**: Documentation and release notes

## Platform-Specific Considerations

### macOS

**Pros:**
- Best Electron support
- Native look and feel
- Easy signing and notarization

**Considerations:**
- Requires Apple Developer account ($99/year) for distribution
- Gatekeeper requires notarization
- PATH environment variable issues (handled by `fix-path`)
- Sandbox restrictions for file access

**Testing:**
- Test on both Intel and Apple Silicon Macs
- Test on multiple macOS versions (11, 12, 13, 14)

### Windows

**Pros:**
- Wide user base
- No developer account required
- Good Electron support

**Considerations:**
- Code signing certificate recommended (paid)
- Windows Defender may flag unsigned apps
- UAC prompts for installation
- Path handling (backslashes vs forward slashes)

**Testing:**
- Test on Windows 10 and 11
- Test both installer and portable versions
- Test with and without admin rights

### Linux

**Pros:**
- Free and open distribution
- AppImage works universally
- No signing requirements

**Considerations:**
- Multiple distributions to support
- Different package managers (deb, rpm, etc.)
- File system permissions
- Desktop integration varies by distro

**Testing:**
- Test on Ubuntu/Debian
- Test on Fedora/RHEL
- Test on Arch Linux
- Test AppImage on multiple distros

## Advantages of Electron Approach

✅ **Cross-platform**: Single codebase for macOS, Windows, Linux
✅ **Native experience**: Desktop app with native menus, dialogs, notifications
✅ **File system access**: Direct access to local files and folders
✅ **Offline capable**: No web server required for users
✅ **Distribution**: Easy packaging and distribution via installers
✅ **Auto-updates**: Built-in update mechanism with electron-updater
✅ **Security**: Sandboxed renderer process with context isolation
✅ **Familiar tech**: Uses existing web technologies (React, TypeScript)
✅ **Python integration**: Bundles Python backend seamlessly

## Troubleshooting

### Common Issues

#### Backend Doesn't Start

**Symptoms:** Application hangs on launch or shows error
**Solutions:**
1. Check Python is installed (dev mode)
2. Verify PyInstaller bundle includes all dependencies
3. Check backend logs in console
4. Ensure port 8000 is not in use

#### Frontend Can't Connect to Backend

**Symptoms:** API errors, network failures
**Solutions:**
1. Verify backend URL is correct
2. Check CORS settings in backend
3. Ensure backend is fully started before frontend loads
4. Check firewall settings

#### Build Fails

**Symptoms:** electron-builder errors
**Solutions:**
1. Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
2. Check all paths in `electron-builder.yml`
3. Ensure backend and frontend are built first
4. Check disk space and permissions

#### App Won't Open on macOS

**Symptoms:** "App is damaged" error
**Solutions:**
1. Sign the application with valid certificate
2. Notarize the app with Apple
3. For testing: `xattr -cr /path/to/app.app`

## Next Steps

1. **Choose Platform**: Start with your primary development platform
2. **Set Up Structure**: Create the electron directory structure
3. **Implement Phase 1**: Backend manager and window manager
4. **Test Dev Mode**: Ensure all three components work together
5. **Build First Package**: Create a test build for your platform
6. **Iterate**: Refine based on testing feedback

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Electron Builder](https://www.electron.build/)
- [PyInstaller Documentation](https://pyinstaller.org/)
- [Electron Security Guide](https://www.electronjs.org/docs/tutorial/security)
- [Code Signing Guide](https://www.electron.build/code-signing)

## Support

For questions or issues during implementation:
1. Check this documentation first
2. Review Electron official docs
3. Search GitHub issues for electron-builder
4. Create an issue in the project repository

---

**Last Updated**: 2024-01-XX
**Version**: 1.0.0
**Status**: Planning Phase
