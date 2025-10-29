import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Folders
export const browseFolders = (path) => api.get('/folders/browse', { params: { path } });
export const getScannedFolders = () => api.get('/folders/scanned');
export const scanFolders = (paths) => api.post('/folders/scan', { paths });
export const removeFolder = (id) => api.delete(`/folders/${id}`);

// Samples
export const listSamples = (params) => api.get('/samples', { params });
export const getSample = (id) => api.get(`/samples/${id}`);
export const streamAudio = (id) => `${API_BASE_URL}/samples/${id}/audio`;
export const updateSample = (id, data) => api.put(`/samples/${id}`, data);
export const deleteSample = (id) => api.delete(`/samples/${id}`);

// Tags
export const listTags = () => api.get('/tags');
export const createTag = (data) => api.post('/tags', data);
export const updateTag = (id, data) => api.put(`/tags/${id}`, data);
export const deleteTag = (id) => api.delete(`/tags/${id}`);
export const addTagsToSample = (sampleId, tagIds) =>
  api.post(`/tags/samples/${sampleId}/tags`, { tag_ids: tagIds });
export const removeTagFromSample = (sampleId, tagId) =>
  api.delete(`/tags/samples/${sampleId}/tags/${tagId}`);

// Collections
export const listCollections = () => api.get('/collections');
export const createCollection = (data) => api.post('/collections', data);
export const getCollection = (id) => api.get(`/collections/${id}`);
export const updateCollection = (id, data) => api.put(`/collections/${id}`, data);
export const deleteCollection = (id) => api.delete(`/collections/${id}`);
export const addItemToCollection = (collectionId, sampleId) =>
  api.post(`/collections/${collectionId}/items`, { sample_id: sampleId });
export const removeItemFromCollection = (collectionId, sampleId) =>
  api.delete(`/collections/${collectionId}/items/${sampleId}`);

// Search
export const searchSamples = (params) => api.get('/search', { params });

// Health check
export const healthCheck = () => api.get('/health');

// Database operations
export const clearAllData = () => api.post('/database/clear');

export default api;
