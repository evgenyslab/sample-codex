import { describe, it, expect, beforeEach } from 'vitest';
import { AudioCache } from './audioCache';

describe('AudioCache', () => {
  let cache: AudioCache;

  beforeEach(() => {
    cache = new AudioCache(1024 * 1024); // 1MB for testing
  });

  describe('get and set', () => {
    it('should store and retrieve blobs', () => {
      const blob = new Blob(['test audio data']);
      cache.set(1, blob);
      expect(cache.get(1)).toBe(blob);
    });

    it('should return null for non-existent entries', () => {
      expect(cache.get(999)).toBeNull();
    });

    it('should accept both number and string IDs', () => {
      const blob1 = new Blob(['audio 1']);
      const blob2 = new Blob(['audio 2']);
      cache.set(1, blob1);
      cache.set('sample-2', blob2);
      expect(cache.get(1)).toBe(blob1);
      expect(cache.get('sample-2')).toBe(blob2);
    });
  });

  describe('has', () => {
    it('should return true for cached items', () => {
      const blob = new Blob(['test']);
      cache.set(1, blob);
      expect(cache.has(1)).toBe(true);
    });

    it('should return false for non-cached items', () => {
      expect(cache.has(999)).toBe(false);
    });
  });

  describe('LRU behavior', () => {
    it('should update lastAccessed on get', () => {
      const blob = new Blob(['test']);
      cache.set(1, blob);

      // Access the entry
      cache.get(1);

      // The entry should still be there
      expect(cache.has(1)).toBe(true);
    });

    it('should evict oldest entries when cache is full', () => {
      // Create blobs that will fill the 1MB cache
      const largeBlob = new Blob([new ArrayBuffer(600 * 1024)]); // 600KB

      cache.set(1, largeBlob);
      cache.set(2, largeBlob);

      // Cache should have evicted entry 1 to make room for entry 2
      expect(cache.has(1)).toBe(false);
      expect(cache.has(2)).toBe(true);
    });

    it('should not cache blobs larger than max size', () => {
      const tooLargeBlob = new Blob([new ArrayBuffer(2 * 1024 * 1024)]); // 2MB > 1MB limit
      cache.set(1, tooLargeBlob);
      expect(cache.has(1)).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set(1, new Blob(['test1']));
      cache.set(2, new Blob(['test2']));
      cache.clear();

      expect(cache.has(1)).toBe(false);
      expect(cache.has(2)).toBe(false);
      expect(cache.getStats().count).toBe(0);
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const blob = new Blob(['test data']);
      cache.set(1, blob);

      const stats = cache.getStats();
      expect(stats.count).toBe(1);
      expect(stats.size).toBe(blob.size);
      expect(stats.maxSize).toBe(1024 * 1024);
    });

    it('should track multiple entries', () => {
      cache.set(1, new Blob(['data1']));
      cache.set(2, new Blob(['data2']));

      const stats = cache.getStats();
      expect(stats.count).toBe(2);
    });
  });

  describe('overwriting entries', () => {
    it('should replace existing entries', () => {
      const blob1 = new Blob(['original']);
      const blob2 = new Blob(['updated']);

      cache.set(1, blob1);
      cache.set(1, blob2);

      expect(cache.get(1)).toBe(blob2);
      expect(cache.getStats().count).toBe(1);
    });
  });
});
