import type {
  Collection,
  CollectionMetadata,
  Folder,
  FoldersMetadataResponse,
  ListSamplesParams,
  Sample,
  SelectAllFilters,
  SelectAllResponse,
  BulkTagStatesResponse,
  Tag,
  TagMetadata,
  FileLocationsResponse,
  ReconcileStats,
  OrphanedFile,
} from '../types';
import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request/Response types
interface BrowseFoldersResponse {
  path: string;
  parent: string | null;
  directories: string[];
  files?: string[];
}

interface ScanFoldersRequest {
  paths: string[];
}

interface CreateTagRequest {
  name: string;
}

interface UpdateTagRequest {
  name: string;
}

interface AddTagsToSampleRequest {
  tag_ids: number[];
}

interface BulkUpdateTagsRequest {
  file_ids: number[];
  add_tag_ids: number[];
  remove_tag_ids: number[];
}

interface CreateCollectionRequest {
  name: string;
  description?: string;
}

interface UpdateCollectionRequest {
  name?: string;
  description?: string;
}

interface AddItemToCollectionRequest {
  sample_id: number;
  alias: string | null;
}

interface BulkUpdateCollectionsRequest {
  file_ids: number[];
  add_collection_ids: number[];
  remove_collection_ids: number[];
}

interface UpdateSampleRequest {
  filename?: string;
  filepath?: string;
  folder_id?: number;
}

interface SearchParams {
  q: string;
  tag_ids?: number[];
  collection_ids?: number[];
  folder_ids?: number[];
}

interface DatabaseStatus {
  exists: boolean;
  path: string;
  writable: boolean;
  size: number | null;
  samples_count: number | null;
}

interface DatabaseInitRequest {
  mode: 'load' | 'create';
  path: string;
  name?: string;
}

interface DatabaseInitResponse {
  success: boolean;
  path: string;
  error: string | null;
}

interface DatabaseInfo {
  path: string;
  size: number;
  created: number;
  modified: number;
  samples: number;
  tags: number;
  collections: number;
  folders: number;
}

// Folders
export const browseFolders = (
  path?: string,
  includeFiles?: boolean,
  fileFilter?: string
): Promise<AxiosResponse<BrowseFoldersResponse>> =>
  api.get('/folders/browse', {
    params: {
      path: path || undefined,
      include_files: includeFiles || undefined,
      file_filter: fileFilter || undefined,
    },
  });

export const getScannedFolders = (): Promise<AxiosResponse<Folder[]>> =>
  api.get('/folders/scanned');

export const getFoldersMetadata = (): Promise<AxiosResponse<FoldersMetadataResponse>> =>
  api.get('/folders/metadata');

export const scanFolders = (paths: string[]): Promise<AxiosResponse<{ message: string }>> =>
  api.post('/folders/scan', { paths } as ScanFoldersRequest);

export const removeFolder = (id: number): Promise<AxiosResponse<{ message: string }>> =>
  api.delete(`/folders/${id}`);

// Samples
export const listSamples = (params?: ListSamplesParams): Promise<AxiosResponse<Sample[]>> =>
  api.get('/samples', { params });

export const getSample = (id: number): Promise<AxiosResponse<Sample>> =>
  api.get(`/samples/${id}`);

export const streamAudio = (id: number): string =>
  `${API_BASE_URL}/samples/${id}/audio`;

export const updateSample = (id: number, data: UpdateSampleRequest): Promise<AxiosResponse<Sample>> =>
  api.put(`/samples/${id}`, data);

export const deleteSample = (id: number): Promise<AxiosResponse<{ message: string }>> =>
  api.delete(`/samples/${id}`);

export const selectAllSamples = (filters: SelectAllFilters): Promise<AxiosResponse<SelectAllResponse>> =>
  api.post('/samples/select-all', filters);

export const getBulkTagStates = (sampleIds: number[]): Promise<AxiosResponse<BulkTagStatesResponse>> =>
  api.post('/samples/bulk-tag-states', { sample_ids: sampleIds });

// Tags
export const listTags = (): Promise<AxiosResponse<{ tags: Tag[] }>> =>
  api.get('/tags');

export const getTagsMetadata = (): Promise<AxiosResponse<{ tags: TagMetadata[] }>> =>
  api.get('/tags/metadata');

export const createTag = (data: CreateTagRequest): Promise<AxiosResponse<Tag>> =>
  api.post('/tags', data);

export const updateTag = (id: number, data: UpdateTagRequest): Promise<AxiosResponse<Tag>> =>
  api.put(`/tags/${id}`, data);

export const deleteTag = (id: number): Promise<AxiosResponse<{ message: string }>> =>
  api.delete(`/tags/${id}`);

export const addTagsToSample = (
  sampleId: number,
  tagIds: number[]
): Promise<AxiosResponse<{ message: string }>> =>
  api.post(`/tags/samples/${sampleId}/tags`, { tag_ids: tagIds } as AddTagsToSampleRequest);

export const removeTagFromSample = (
  sampleId: number,
  tagId: number
): Promise<AxiosResponse<{ message: string }>> =>
  api.delete(`/tags/samples/${sampleId}/tags/${tagId}`);

export const bulkUpdateSampleTags = (
  sampleIds: number[],
  addTagIds: number[],
  removeTagIds: number[]
): Promise<AxiosResponse<{ message: string; updated_count: number }>> =>
  api.post('/tags/bulk', {
    file_ids: sampleIds,
    add_tag_ids: addTagIds,
    remove_tag_ids: removeTagIds,
  } as BulkUpdateTagsRequest);

// Collections
export const listCollections = (): Promise<AxiosResponse<{ collections: Collection[] }>> =>
  api.get('/collections');

export const getCollectionsMetadata = (): Promise<AxiosResponse<{ collections: CollectionMetadata[] }>> =>
  api.get('/collections/metadata');

export const createCollection = (data: CreateCollectionRequest): Promise<AxiosResponse<Collection>> =>
  api.post('/collections', data);

export const getCollection = (id: number): Promise<AxiosResponse<Collection>> =>
  api.get(`/collections/${id}`);

export const updateCollection = (id: number, data: UpdateCollectionRequest): Promise<AxiosResponse<Collection>> =>
  api.put(`/collections/${id}`, data);

export const deleteCollection = (id: number): Promise<AxiosResponse<{ message: string }>> =>
  api.delete(`/collections/${id}`);

export const addItemToCollection = (
  collectionId: number,
  sampleId: number,
  alias: string | null = null
): Promise<AxiosResponse<{ message: string }>> =>
  api.post(`/collections/${collectionId}/items`, { sample_id: sampleId, alias } as AddItemToCollectionRequest);

export const removeItemFromCollection = (
  collectionId: number,
  sampleId: number
): Promise<AxiosResponse<{ message: string }>> =>
  api.delete(`/collections/${collectionId}/items/${sampleId}`);

export const bulkUpdateSampleCollections = (
  sampleIds: number[],
  addCollectionIds: number[],
  removeCollectionIds: number[]
): Promise<AxiosResponse<{ message: string; updated_count: number }>> =>
  api.post('/collections/bulk', {
    file_ids: sampleIds,
    add_collection_ids: addCollectionIds,
    remove_collection_ids: removeCollectionIds,
  } as BulkUpdateCollectionsRequest);

// Search
export const searchSamples = (params: SearchParams): Promise<AxiosResponse<Sample[]>> =>
  api.get('/search', { params });

// Health check
export const healthCheck = (): Promise<AxiosResponse<{ status: string; database: boolean; database_path: string }>> =>
  api.get('/health');

// Database operations
export const getDatabaseStatus = (): Promise<AxiosResponse<DatabaseStatus>> =>
  api.get('/database/status');

export const initializeDatabase = (data: DatabaseInitRequest): Promise<AxiosResponse<DatabaseInitResponse>> =>
  api.post('/database/initialize', data);

export const getDatabaseInfo = (): Promise<AxiosResponse<DatabaseInfo>> =>
  api.get('/database/info');

export const clearAllData = (): Promise<AxiosResponse<{ message: string }>> =>
  api.post('/database/clear');

export const reconcileDatabase = (): Promise<AxiosResponse<{ status: string; stats: ReconcileStats }>> =>
  api.post('/database/reconcile');

export const getOrphanedFiles = (): Promise<AxiosResponse<{ orphaned_files: OrphanedFile[]; total: number }>> =>
  api.get('/database/orphaned-files');

// File locations (for duplicate file handling)
export const getFileLocations = (fileId: number): Promise<AxiosResponse<FileLocationsResponse>> =>
  api.get(`/samples/${fileId}/locations`);

export const setPrimaryLocation = (
  fileId: number,
  locationId: number
): Promise<AxiosResponse<{ status: string; file_id: number; primary_location_id: number }>> =>
  api.put(`/samples/${fileId}/locations/primary`, { location_id: locationId });

export const deleteFileLocation = (
  fileId: number,
  locationId: number
): Promise<AxiosResponse<{ status: string; file_id: number; location_id: number }>> =>
  api.delete(`/samples/${fileId}/locations/${locationId}`);

export default api;
