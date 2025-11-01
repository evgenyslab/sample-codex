import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock AudioContext for tests
global.AudioContext = class MockAudioContext {
  state = 'running';
  sampleRate = 44100;
  currentTime = 0;
  destination = { channelCount: 2 };
  baseLatency = 0;

  createBufferSource() {
    return {
      buffer: null,
      loop: false,
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {},
      onended: null,
    };
  }

  createGain() {
    return {
      gain: { value: 1 },
      connect: () => {},
      disconnect: () => {},
      context: this,
    };
  }

  decodeAudioData() {
    return Promise.resolve({
      duration: 10,
      numberOfChannels: 2,
      sampleRate: 44100,
      getChannelData: () => new Float32Array(100),
    });
  }

  resume() {
    return Promise.resolve();
  }

  close() {
    this.state = 'closed';
    return Promise.resolve();
  }
} as any;

window.AudioContext = global.AudioContext as any;
