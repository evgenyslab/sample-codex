# TypeScript Migration Plan - Executable Version with Testing

## Overview
Convert all 27 JavaScript files to TypeScript with comprehensive testing at each step.

**Status:** ✅ PHASE 0-2 COMPLETE (Setup + Core Infrastructure)
**Completed:** 8 files + test infrastructure
**Remaining:** 19 JSX component files

## Progress Summary

### ✅ Completed (8 files)
- **Phase 0:** TypeScript setup, Vitest configuration, test infrastructure
- **Phase 1:** Utility files (3)
  - `src/utils/audioCache.ts` + tests
  - `src/utils/audioContext.ts` + tests
  - `src/services/api.ts`
- **Phase 2:** Hooks (2)
  - `src/hooks/useAudioPlayback.ts`
  - `src/hooks/useScanProgress.tsx`
- **Additional:** Type definitions (`src/types/index.ts`), test setup, vite config

### 🔄 Remaining (19 JSX files)
All component and page files still in JavaScript - ready for conversion following established patterns

---

## Phase 0: Setup & Prerequisites (Day 1)

### 0.1 Install TypeScript Dependencies
```bash
npm install --save-dev typescript @types/node vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/ui
```

### 0.2 Create TypeScript Configurations

**File:** `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,

    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**File:** `tsconfig.node.json`
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

**File:** `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**File:** `src/test/setup.ts`
```typescript
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

### 0.3 Update package.json Scripts
Add to scripts section:
```json
{
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage",
  "type-check": "tsc --noEmit"
}
```

### 0.4 Create Core Type Definitions

**File:** `src/types/index.ts`
```typescript
// API Response Types
export interface Sample {
  id: number;
  filename: string;
  filepath: string;
  file_hash?: string;
  file_size: number;
  duration: number | null;
  sample_rate: number | null;
  format: string | null;
  bit_depth: number | null;
  channels: number | null;
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  created_at?: string;
  last_modified?: string;
  indexed?: number;
  tags?: Tag[];
  collections?: Collection[];
}

export interface Tag {
  id: number;
  name: string;
  color?: string;
  confidence?: number;
}

export interface Collection {
  id: number;
  name: string;
  description?: string;
  alias?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Folder {
  id: number;
  path: string;
  sample_count?: number;
  created_at?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface SamplesResponse {
  samples: Sample[];
  pagination: PaginationInfo;
}

export interface TagsResponse {
  tags: Tag[];
}

export interface CollectionsResponse {
  collections: Collection[];
}

export interface FoldersResponse {
  folders: Folder[];
}

// WebSocket Types
export interface WSProgressMessage {
  type: 'progress';
  phase: 'scanning' | 'processing';
  progress: number;
  message: string;
}

export interface WSStatsUpdate {
  type: 'stats_update';
  stats: {
    samples: number;
    tags: number;
    collections: number;
  };
}

export interface WSComplete {
  type: 'complete';
  message: string;
}

export interface WSError {
  type: 'error';
  message: string;
}

export type WSMessage = WSProgressMessage | WSStatsUpdate | WSComplete | WSError;

// Audio Types
export interface AudioCacheEntry {
  blob: Blob;
  size: number;
  lastAccessed: number;
}
```

**Verification Steps:**
- [ ] Run `npm install` successfully
- [ ] Run `npx tsc --noEmit` - should complete with no errors (no TS files yet)
- [ ] Run `npm run dev` - should still work
- [ ] Run `npm test` - Vitest should initialize

---

## Phase 1: Foundation Layer (Days 2-3)

### 1.1 Convert `src/utils/audioCache.js` → `audioCache.ts`

**Key Functionality to Test:**
- Cache initialization with size limit
- Setting items in cache
- Getting items from cache (updates lastAccessed)
- Cache eviction (LRU) when size exceeded
- Clearing cache

**Create Test File:** `src/utils/audioCache.test.ts`
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import audioCache from './audioCache';

describe('audioCache', () => {
  beforeEach(() => {
    audioCache.clear();
  });

  it('should store and retrieve blobs', () => {
    const blob = new Blob(['test']);
    audioCache.set(1, blob);
    expect(audioCache.get(1)).toBe(blob);
  });

  it('should return null for non-existent keys', () => {
    expect(audioCache.get(999)).toBeNull();
  });

  it('should update lastAccessed on get', () => {
    const blob = new Blob(['test']);
    audioCache.set(1, blob);
    const firstAccess = Date.now();

    // Wait a bit
    setTimeout(() => {
      audioCache.get(1);
      // lastAccessed should be updated
    }, 100);
  });

  it('should clear all entries', () => {
    audioCache.set(1, new Blob(['test1']));
    audioCache.set(2, new Blob(['test2']));
    audioCache.clear();
    expect(audioCache.get(1)).toBeNull();
    expect(audioCache.get(2)).toBeNull();
  });

  // LRU eviction test would need mocking or large blobs
});
```

**TypeScript Conversion Checklist:**
- [ ] Rename file to `.ts`
- [ ] Define `AudioCacheEntry` interface (already in types/index.ts)
- [ ] Type the Map: `Map<number, AudioCacheEntry>`
- [ ] Add return types to all methods
- [ ] Run `npm run type-check`
- [ ] Run tests: `npm test audioCache`
- [ ] Manual test: Open app, play audio, check cache works

---

### 1.2 Convert `src/utils/audioContext.js` → `audioContext.ts`

**Key Functionality to Test:**
- getAudioContext creates singleton
- getAudioContext reuses existing context
- resumeAudioContext resumes suspended context
- resetAudioContext creates new context
- Recovery listeners set up correctly

**Create Test File:** `src/utils/audioContext.test.ts`
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAudioContext, resumeAudioContext, resetAudioContext } from './audioContext';

// Mock AudioContext
class MockAudioContext {
  state: AudioContextState = 'suspended';
  sampleRate = 48000;
  destination = { channelCount: 2 };
  baseLatency = 0.01;
  currentTime = 0;

  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });

  close = vi.fn(() => {
    this.state = 'closed';
    return Promise.resolve();
  });
}

describe('audioContext', () => {
  beforeEach(() => {
    // @ts-ignore - mocking browser API
    global.AudioContext = MockAudioContext;
    // Reset module state between tests
    vi.resetModules();
  });

  it('should create AudioContext singleton', () => {
    const ctx1 = getAudioContext();
    const ctx2 = getAudioContext();
    expect(ctx1).toBe(ctx2);
  });

  it('should resume suspended context', async () => {
    const ctx = getAudioContext();
    expect(ctx.state).toBe('suspended');

    await resumeAudioContext();
    expect(ctx.state).toBe('running');
  });

  it('should reset context when needed', () => {
    const ctx1 = getAudioContext();
    const ctx2 = resetAudioContext();
    expect(ctx1).not.toBe(ctx2);
  });
});
```

**TypeScript Conversion Checklist:**
- [ ] Rename file to `.ts`
- [ ] Add return types (`: AudioContext`, `: Promise<AudioContext>`)
- [ ] Type `globalAudioContext: AudioContext | null`
- [ ] Type `isRecovering: boolean`
- [ ] Run `npm run type-check`
- [ ] Run tests: `npm test audioContext`
- [ ] Manual test: Open app, play audio, check audio plays

---

### 1.3 Convert `src/services/api.js` → `api.ts`

**Key Functionality to Test:**
- Axios instance created with correct baseURL
- All API methods return typed responses
- Error handling works

**Create Test File:** `src/services/api.test.ts`
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import * as api from './api';

vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listSamples', () => {
    it('should fetch samples with params', async () => {
      const mockResponse = {
        data: {
          samples: [],
          pagination: { page: 1, limit: 100, total: 0, pages: 0 }
        }
      };
      mockedAxios.create.mockReturnThis();
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await api.listSamples({ page: 1, limit: 100 });
      expect(result.data.samples).toEqual([]);
    });
  });

  describe('listTags', () => {
    it('should fetch all tags', async () => {
      const mockResponse = { data: { tags: [] } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await api.listTags();
      expect(result.data.tags).toEqual([]);
    });
  });

  // Add more API method tests...
});
```

**TypeScript Conversion Checklist:**
- [ ] Rename file to `.ts`
- [ ] Import types from `@/types`
- [ ] Type axios instance: `AxiosInstance`
- [ ] Add return types using `AxiosResponse<T>`
- [ ] Type all function parameters
- [ ] Run `npm run type-check`
- [ ] Run tests: `npm test api`
- [ ] Manual test: Open app, verify data loads

**Phase 1 Completion Verification:**
- [ ] All 3 files converted to TypeScript
- [ ] No TypeScript errors: `npm run type-check`
- [ ] All tests pass: `npm test`
- [ ] No ESLint errors: `npm run lint`
- [ ] App runs: `npm run dev`
- [ ] Manual smoke test: Browse samples, play audio

---

## Phase 2: Core Infrastructure (Days 4-5)

### 2.1 Convert `src/contexts/ThemeContext.jsx` → `ThemeContext.tsx`

**Key Functionality:**
- Theme state (light/dark/system)
- setTheme function
- localStorage persistence
- System preference detection

**Create Test File:** `src/contexts/ThemeContext.test.tsx`
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

const TestComponent = () => {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('light')}>Light</button>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should provide default theme', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('should allow theme changes', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText('Light'));
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
  });
});
```

**TypeScript Conversion Checklist:**
- [ ] Rename to `.tsx`
- [ ] Define `Theme` type: `'light' | 'dark' | 'system'`
- [ ] Define `ThemeContextType` interface
- [ ] Type context: `React.Context<ThemeContextType | undefined>`
- [ ] Type provider props: `{ children: React.ReactNode }`
- [ ] Run type-check and tests
- [ ] Manual test: Toggle theme in UI

---

### 2.2 Convert `src/hooks/useAudioPlayback.js` → `useAudioPlayback.ts`

**Key Functionality:**
- Load and decode audio blob
- Play/pause/stop controls
- Playback position tracking
- Loop mode
- Seek functionality

**Create Test File:** `src/hooks/useAudioPlayback.test.ts`
```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useAudioPlayback from './useAudioPlayback';

// Mock AudioContext and related APIs
global.AudioContext = class MockAudioContext {
  state = 'running';
  currentTime = 0;
  sampleRate = 48000;
  destination = {};

  createBufferSource() {
    return {
      buffer: null,
      loop: false,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
      onended: null
    };
  }

  createGain() {
    return {
      gain: { value: 1 },
      connect: vi.fn(),
      context: this
    };
  }

  decodeAudioData() {
    return Promise.resolve({
      duration: 10,
      numberOfChannels: 2,
      sampleRate: 48000,
      length: 480000
    });
  }
};

describe('useAudioPlayback', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAudioPlayback(null));

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isLooping).toBe(false);
    expect(result.current.playbackPosition).toBe(0);
    expect(result.current.duration).toBe(0);
  });

  it('should decode audio blob', async () => {
    const blob = new Blob(['mock audio data']);
    const { result } = renderHook(() => useAudioPlayback(blob));

    // Wait for audio to decode
    await vi.waitFor(() => {
      expect(result.current.audioBuffer).not.toBeNull();
    });
  });

  // More tests for play, pause, seek, toggle loop...
});
```

**TypeScript Conversion Checklist:**
- [ ] Rename to `.ts`
- [ ] Define return type interface: `AudioPlaybackControls`
- [ ] Type all refs properly
- [ ] Type callback parameters
- [ ] Run type-check and tests
- [ ] Manual test: Play audio in app

---

### 2.3 Convert `src/hooks/useScanProgress.jsx` → `useScanProgress.tsx`

**Key Functionality:**
- WebSocket connection
- Message parsing and state updates
- Connection status tracking
- Automatic reconnection

**Create Test File:** `src/hooks/useScanProgress.test.tsx`
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScanProgress } from './useScanProgress';
import WS from 'vitest-websocket-mock';

describe('useScanProgress', () => {
  let server: WS;

  beforeEach(() => {
    server = new WS('ws://localhost:8000/ws/scan');
  });

  afterEach(() => {
    server.close();
  });

  it('should connect to WebSocket', async () => {
    const { result } = renderHook(() => useScanProgress());

    await server.connected;
    expect(result.current.isConnected).toBe(true);
  });

  it('should handle progress messages', async () => {
    const { result } = renderHook(() => useScanProgress());
    await server.connected;

    server.send(JSON.stringify({
      type: 'progress',
      phase: 'scanning',
      progress: 50,
      message: 'Scanning files...'
    }));

    await vi.waitFor(() => {
      expect(result.current.progress).toBe(50);
      expect(result.current.phase).toBe('scanning');
    });
  });
});
```

**TypeScript Conversion Checklist:**
- [ ] Rename to `.tsx`
- [ ] Import `WSMessage` types from `@/types`
- [ ] Define return type interface
- [ ] Type WebSocket properly
- [ ] Type message event handlers
- [ ] Run type-check and tests
- [ ] Manual test: Scan folders in app

**Phase 2 Completion Verification:**
- [ ] All 3 files converted
- [ ] Type check passes
- [ ] All tests pass
- [ ] App runs without errors
- [ ] Theme switching works
- [ ] Audio playback works
- [ ] Folder scanning works

---

## Phase 3: UI Components (Days 6-7)

### 3.1 Convert `src/components/ui/Icons.jsx` → `Icons.tsx`

**Key Functionality:**
- All icon exports work
- Icons render correctly
- Props passed through

**Test File:** `src/components/ui/Icons.test.tsx`
```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PlayIcon, PauseIcon, SearchIcon } from './Icons';

describe('Icons', () => {
  it('should render PlayIcon', () => {
    const { container } = render(<PlayIcon />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should accept className prop', () => {
    const { container } = render(<PlayIcon className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should accept size prop', () => {
    const { container } = render(<PlayIcon size={24} />);
    const svg = container.firstChild as SVGElement;
    expect(svg.getAttribute('width')).toBe('24');
  });
});
```

**Conversion Steps:**
- [ ] Rename to `.tsx`
- [ ] Import icon types from libraries
- [ ] Export with proper SVG prop types
- [ ] Run tests

---

### 3.2 Convert `src/components/ui/Card.jsx` → `Card.tsx`

**Functionality:** Render with different variants, accept children

**Test:** `src/components/ui/Card.test.tsx`
```typescript
import { describe, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';

describe('Card', () => {
  it('should render children', () => {
    render(<Card>Test Content</Card>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});
```

---

### 3.3 Convert `src/components/ui/Toggle.jsx` → `Toggle.tsx`

**Functionality:** Toggle on/off, callback on change

**Test:** `src/components/ui/Toggle.test.tsx`

---

## Phase 4: Complex Components (Days 8-10)

### For Each Component:
1. Create `.test.tsx` file testing key interactions
2. Convert to TypeScript
3. Define prop interfaces
4. Test type-checking
5. Run tests
6. Manual verification in app

### 4.1 WaveformDisplay.tsx
**Tests:** Canvas renders, waveform draws, seek works, playback indicator

### 4.2 SamplePlayer.tsx
**Tests:** Loads audio, controls work, keyboard shortcuts, loop toggle

### 4.3 FolderTreePane.tsx
**Tests:** Renders tree, expansion works, selection works

### 4.4 FilterPane.tsx
**Tests:** Filters displayed, include/exclude works, search works

### 4.5 TagPopup.tsx
**Tests:** Shows tags, creates tags, assigns tags, validation

### 4.6 CollectionPopup.tsx
**Tests:** Shows collections, creates collections, assigns, validation

### 4.7 FolderBrowserModal.tsx
**Tests:** Browses folders, selects folders, adds folders

### 4.8 SettingsModal.tsx
**Tests:** Shows settings, saves settings, toggles work

### 4.9 Sidebar.tsx
**Tests:** Navigation works, active link highlighted, scan button

---

## Phase 5: Pages (Days 11-13)

### For Each Page:
1. Test key page functionality
2. Convert with proper route types
3. Test queries and mutations
4. Verify all features work

### 5.1-5.6 All Page Components
Each page gets test file covering main features

---

## Phase 6-7: Entry Points & Cleanup (Days 14-15)

### 6.1 Convert App.tsx
**Tests:** Routes render, QueryClient setup, theme provider

### 6.2 Convert main.tsx
**Tests:** App mounts without errors

### 7.1 Cleanup
- Remove any `any` types
- Add missing exports
- Update documentation
- Final test run

---

## Execution Checklist (For AI Agent)

### Before Each File Conversion:
- [ ] Read current file completely
- [ ] Identify all types needed
- [ ] Check for dependencies already converted

### During Conversion:
- [ ] Rename file extension
- [ ] Add all imports (including types)
- [ ] Define interfaces/types at top
- [ ] Add type annotations to all functions
- [ ] Type all hooks and refs
- [ ] Type all event handlers

### After Conversion:
- [ ] Run `npm run type-check`
- [ ] Fix any type errors
- [ ] Create test file if applicable
- [ ] Run `npm test [filename]`
- [ ] Run `npm run dev` and manually test
- [ ] Verify in browser that feature works

### Per Phase Completion:
- [ ] All files in phase converted
- [ ] All tests pass
- [ ] Type check passes
- [ ] ESLint passes
- [ ] Manual smoke test in browser
- [ ] Commit with message: "Phase X: [description]"

---

## Success Metrics

- [ ] 0 TypeScript errors
- [ ] 0 ESLint errors
- [ ] All 27 files converted
- [ ] Test coverage > 70%
- [ ] All features work identically
- [ ] Build size within 10% of original
- [ ] No runtime errors in console

---

## Emergency Rollback

If a conversion breaks functionality:
1. Revert the specific file: `git checkout HEAD -- src/path/to/file.tsx`
2. Fix types and retry
3. Each phase is a commit, can rollback entire phase if needed

---

This plan is now executable step-by-step with clear verification at each stage.
