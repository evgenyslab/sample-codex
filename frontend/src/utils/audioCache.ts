/**
 * LRU Cache for audio file blobs
 *
 * Stores audio files in memory with a configurable size limit.
 * When the cache exceeds the limit, the least recently used items are evicted.
 */

const DEFAULT_MAX_SIZE = 32 * 1024 * 1024; // 32MB default

interface CacheEntry {
  blob: Blob;
  size: number;
  lastAccessed: number;
}

interface CacheStats {
  count: number;
  size: number;
  maxSize: number;
}

export class AudioCache {
  public maxSize: number;
  private currentSize: number;
  private cache: Map<number | string, CacheEntry>;

  constructor(maxSizeBytes: number = DEFAULT_MAX_SIZE) {
    this.maxSize = maxSizeBytes;
    this.currentSize = 0;
    this.cache = new Map();
  }

  /**
   * Get audio blob from cache
   * @param sampleId - The sample ID
   * @returns The cached blob or null if not found
   */
  get(sampleId: number | string): Blob | null {
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
   * @param sampleId - The sample ID
   * @param blob - The audio blob to cache
   */
  set(sampleId: number | string, blob: Blob): void {
    const size = blob.size;

    // If the blob is larger than max cache size, don't cache it
    if (size > this.maxSize) {
      console.warn(`Audio file ${sampleId} (${this.formatBytes(size)}) exceeds cache limit`);
      return;
    }

    // Remove existing entry if present
    if (this.cache.has(sampleId)) {
      const oldEntry = this.cache.get(sampleId);
      if (oldEntry) {
        this.currentSize -= oldEntry.size;
      }
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
   * @param sampleId - The sample ID
   * @returns Whether the sample is cached
   */
  has(sampleId: number | string): boolean {
    return this.cache.has(sampleId);
  }

  /**
   * Remove oldest (least recently accessed) entry from cache
   */
  private evictOldest(): void {
    let oldestId: number | string | null = null;
    let oldestTime = Infinity;

    for (const [id, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestId = id;
      }
    }

    if (oldestId !== null) {
      const entry = this.cache.get(oldestId);
      if (entry) {
        this.currentSize -= entry.size;
        this.cache.delete(oldestId);

        if (import.meta.env.DEV) {
          console.log(`Evicted audio ${oldestId} (${this.formatBytes(entry.size)})`);
        }
      }
    }
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      count: this.cache.size,
      size: this.currentSize,
      maxSize: this.maxSize,
    };
  }

  /**
   * Format bytes to human-readable string
   * @param bytes - Number of bytes
   * @returns Formatted string
   */
  private formatBytes(bytes: number): string {
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
export const setMaxCacheSize = (sizeBytes: number): void => {
  audioCache.maxSize = sizeBytes;
};

export default audioCache;
