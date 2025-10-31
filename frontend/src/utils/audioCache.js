/**
 * LRU Cache for audio file blobs
 *
 * Stores audio files in memory with a configurable size limit.
 * When the cache exceeds the limit, the least recently used items are evicted.
 */

const DEFAULT_MAX_SIZE = 32 * 1024 * 1024; // 32MB default

class AudioCache {
  constructor(maxSizeBytes = DEFAULT_MAX_SIZE) {
    this.maxSize = maxSizeBytes;
    this.currentSize = 0;
    // Map: sampleId -> { blob, size, lastAccessed }
    this.cache = new Map();
  }

  /**
   * Get audio blob from cache
   * @param {number|string} sampleId - The sample ID
   * @returns {Blob|null} The cached blob or null if not found
   */
  get(sampleId) {
    const entry = this.cache.get(sampleId);
    if (!entry) {
      return null;
    }

    // Update last accessed time
    entry.lastAccessed = Date.now();
    return entry.blob;
  }

  /**
   * Store audio blob in cache
   * @param {number|string} sampleId - The sample ID
   * @param {Blob} blob - The audio blob to cache
   */
  set(sampleId, blob) {
    const size = blob.size;

    // If the blob is larger than max cache size, don't cache it
    if (size > this.maxSize) {
      console.warn(`Audio file ${sampleId} (${this.formatBytes(size)}) exceeds cache limit`);
      return;
    }

    // Remove existing entry if present
    if (this.cache.has(sampleId)) {
      const oldEntry = this.cache.get(sampleId);
      this.currentSize -= oldEntry.size;
      this.cache.delete(sampleId);
    }

    // Evict oldest entries until there's room
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictOldest();
    }

    // Add new entry
    this.cache.set(sampleId, {
      blob,
      size,
      lastAccessed: Date.now(),
    });
    this.currentSize += size;

    if (import.meta.env.DEV) {
      console.log(`Cached audio ${sampleId} (${this.formatBytes(size)}). Cache: ${this.formatBytes(this.currentSize)}/${this.formatBytes(this.maxSize)}`);
    }
  }

  /**
   * Check if sample is in cache
   * @param {number|string} sampleId - The sample ID
   * @returns {boolean}
   */
  has(sampleId) {
    return this.cache.has(sampleId);
  }

  /**
   * Remove oldest (least recently accessed) entry from cache
   */
  evictOldest() {
    let oldestId = null;
    let oldestTime = Infinity;

    for (const [id, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestId = id;
      }
    }

    if (oldestId !== null) {
      const entry = this.cache.get(oldestId);
      this.currentSize -= entry.size;
      this.cache.delete(oldestId);

      if (import.meta.env.DEV) {
        console.log(`Evicted audio ${oldestId} (${this.formatBytes(entry.size)})`);
      }
    }
  }

  /**
   * Clear all cached data
   */
  clear() {
    this.cache.clear();
    this.currentSize = 0;
  }

  /**
   * Get cache statistics
   * @returns {{count: number, size: number, maxSize: number}}
   */
  getStats() {
    return {
      count: this.cache.size,
      size: this.currentSize,
      maxSize: this.maxSize,
    };
  }

  /**
   * Format bytes to human-readable string
   * @param {number} bytes
   * @returns {string}
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}

// Global cache instance
export const audioCache = new AudioCache(DEFAULT_MAX_SIZE);

// Allow configuration
export const setMaxCacheSize = (sizeBytes) => {
  audioCache.maxSize = sizeBytes;
};

export default audioCache;
