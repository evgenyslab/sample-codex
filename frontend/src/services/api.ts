import axios, { AxiosResponse } from 'axios';
import type { Sample, Tag, Collection, Folder } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request/Response types
interface BrowseFoldersResponse {
  folders: Array<{ name: string; path: string }>;
  files: string[];
  current_path: string;
}

interface ListSamplesParams {
  tag_ids?: number[];
  collection_ids?: number[];
  folder_ids?: number[];
  search?: string;
  page?: number;
  page_size?: number;
  limit?: number;
  tags?: string;
  exclude_tags?: string;
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
  sample_ids: number[];
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
  sample_ids: number[];
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

// Folders
export const browseFolders = (path?: string): Promise<AxiosResponse<BrowseFoldersResponse>> =>
  api.get('/folders/browse', { params: { path } });

export const getScannedFolders = (): Promise<AxiosResponse<Folder[]>> =>
  api.get('/folders/scanned');

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

// Tags
export const listTags = (): Promise<AxiosResponse<Tag[]>> =>
  api.get('/tags');

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
    sample_ids: sampleIds,
    add_tag_ids: addTagIds,
    remove_tag_ids: removeTagIds,
  } as BulkUpdateTagsRequest);

// Collections
export const listCollections = (): Promise<AxiosResponse<Collection[]>> =>
  api.get('/collections');

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
    sample_ids: sampleIds,
    add_collection_ids: addCollectionIds,
    remove_collection_ids: removeCollectionIds,
  } as BulkUpdateCollectionsRequest);

// Search
export const searchSamples = (params: SearchParams): Promise<AxiosResponse<Sample[]>> =>
  api.get('/search', { params });

// Health check
export const healthCheck = (): Promise<AxiosResponse<{ status: string }>> =>
  api.get('/health');

// Database operations
export const clearAllData = (): Promise<AxiosResponse<{ message: string }>> =>
  api.post('/database/clear');

export default api;
