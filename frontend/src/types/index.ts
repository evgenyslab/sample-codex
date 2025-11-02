// Core domain types

export interface Tag {
  id: number;
  name: string;
  color: string | null;
}

export interface Collection {
  id: number;
  name: string;
  description: string | null;
  alias?: string;
}

export interface Folder {
  id: number;
  name: string;
  path: string;
}

export interface Sample {
  id: number;
  filename: string;
  filepath: string;
  folder_id: number;
  folder_name?: string;
  tags: Tag[];
  collections: Collection[];
  created_at?: string;
  updated_at?: string;
}

// WebSocket message types
export interface WebSocketProgressMessage {
  type: 'progress';
  phase: 'scanning' | 'processing';
  progress: number;
  message: string;
}

export interface WebSocketStatsUpdateMessage {
  type: 'stats_update';
  stats: {
    samples: number;
    tags: number;
    collections: number;
    folders: number;
  };
}

export interface WebSocketCompleteMessage {
  type: 'complete';
  message: string;
}

export interface WebSocketErrorMessage {
  type: 'error';
  message: string;
}

export type WebSocketMessage =
  | WebSocketProgressMessage
  | WebSocketStatsUpdateMessage
  | WebSocketCompleteMessage
  | WebSocketErrorMessage;

// Audio types
export interface AudioPlaybackState {
  isPlaying: boolean;
  isLooping: boolean;
  playbackPosition: number;
  duration: number;
  audioBuffer: AudioBuffer | null;
}

export interface AudioPlaybackControls {
  play: () => Promise<void>;
  stop: () => void;
  toggleLoop: () => void;
}

// Filter types
export interface FilterState {
  searchQuery: string;
  selectedTags: number[];
  selectedCollections: number[];
  selectedFolders: number[];
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Health and stats types
export interface HealthStatus {
  status: string;
  database: boolean;
}

export interface AppStats {
  samples: number;
  tags: number;
  collections: number;
  folders: number;
}
