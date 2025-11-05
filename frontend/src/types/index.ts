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
  location_count?: number; // Number of locations (duplicates) for this file
  is_orphaned?: boolean; // True if file has no valid locations
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

export interface WebSocketRefreshFoldersMessage {
  type: 'refresh_folders';
  message: string;
}

export type WebSocketMessage =
  | WebSocketProgressMessage
  | WebSocketStatsUpdateMessage
  | WebSocketCompleteMessage
  | WebSocketErrorMessage
  | WebSocketRefreshFoldersMessage;

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

// Metadata types (with counts for filter panes)
export interface TagMetadata extends Tag {
  sample_count: number;
  auto_generated?: boolean;
  is_system?: boolean;
}

export interface CollectionMetadata extends Collection {
  sample_count: number;
  updated_at?: string;
}

export interface FolderMetadata {
  path: string;
  sample_count: number;
}

export interface FoldersMetadataResponse {
  folders: FolderMetadata[];
  common_root: string;
}

// Select-all response
export interface SelectAllResponse {
  sample_ids: number[];
  total: number;
  limit_reached: boolean;
}

// Bulk tag states response
export interface TagState {
  id: number;
  name: string;
  color: string | null;
  state: 'all' | 'some' | 'none';
  count: number;
}

export interface BulkTagStatesResponse {
  tags: TagState[];
}

// List samples params
export interface ListSamplesParams {
  page?: number;
  limit?: number;
  folder_id?: number;
  tags?: string;
  exclude_tags?: string;
  collections?: string;
  exclude_collections?: string;
  folders?: string;
  exclude_folders?: string;
  search?: string;
  sort_by?: string;
  sort_order?: string;
}

// Select-all filters request
export interface SelectAllFilters {
  tags?: string;
  exclude_tags?: string;
  collections?: string;
  exclude_collections?: string;
  folders?: string;
  exclude_folders?: string;
  search?: string;
}

// File location types (for duplicate file handling)
export interface FileLocation {
  id: number;
  file_path: string;
  file_name: string;
  discovered_at: string;
  last_verified: string;
  is_primary: boolean | number; // SQLite returns 0/1 as integers
}

export interface FileLocationsResponse {
  file_id: number;
  locations: FileLocation[];
  has_duplicates: boolean;
}

// Reconciliation types
export interface ReconcileStats {
  total_files: number;
  total_locations: number;
  valid_locations: number;
  missing_locations: number;
  orphaned_files: number;
  missing_details: Array<{
    file_id: number;
    file_hash: string;
    location_id: number;
    file_path: string;
    was_primary: boolean;
  }>;
}

export interface OrphanedFile {
  id: number;
  file_hash: string;
  format: string;
  file_size: number | null;
  duration: number | null;
  alias: string | null;
  created_at: string;
  last_known_path: string;
  location_count: number;
  missing_count: number;
  tags: Tag[];
  collections: Collection[];
}
