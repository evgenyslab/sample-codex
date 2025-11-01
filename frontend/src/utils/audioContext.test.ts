import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAudioContext, resetAudioContext, resumeAudioContext } from './audioContext';

describe('audioContext', () => {
  beforeEach(() => {
    // Reset any existing context before each test
    vi.clearAllMocks();
  });

  describe('getAudioContext', () => {
    it('should create an AudioContext', () => {
      const ctx = getAudioContext();
      expect(ctx).toBeInstanceOf(AudioContext);
      expect(ctx.state).toBe('running');
    });

    it('should return the same context on subsequent calls', () => {
      const ctx1 = getAudioContext();
      const ctx2 = getAudioContext();
      expect(ctx1).toBe(ctx2);
    });

    it('should have expected properties', () => {
      const ctx = getAudioContext();
      expect(ctx.sampleRate).toBe(44100);
      expect(ctx.destination).toBeDefined();
      expect(ctx.state).toBe('running');
    });
  });

  describe('resumeAudioContext', () => {
    it('should resume a suspended context', async () => {
      const ctx = getAudioContext();

      // Mock suspend the context
      Object.defineProperty(ctx, 'state', {
        get: () => 'suspended',
        configurable: true,
      });

      const resumeSpy = vi.spyOn(ctx, 'resume').mockResolvedValue(undefined);

      await resumeAudioContext();
      expect(resumeSpy).toHaveBeenCalled();
    });

    it('should return the audio context', async () => {
      const ctx = await resumeAudioContext();
      expect(ctx).toBeInstanceOf(AudioContext);
    });
  });

  describe('resetAudioContext', () => {
    it('should create a new context', () => {
      getAudioContext();
      const ctx2 = resetAudioContext();

      // After reset, we get a fresh context
      expect(ctx2).toBeInstanceOf(AudioContext);
    });

    it('should close the old context', () => {
      const ctx1 = getAudioContext();
      const closeSpy = vi.spyOn(ctx1, 'close');

      resetAudioContext();
      expect(closeSpy).toHaveBeenCalled();
    });
  });
});
