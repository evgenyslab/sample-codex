import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import SamplePlayer, { SamplePlayerRef } from './SamplePlayer';
import type { Sample } from '../../types';

// Mock the WaveformDisplay component
vi.mock('./WaveformDisplay', () => ({
  default: () => <div data-testid="waveform-display">Waveform</div>,
}));

// Mock the useAudioPlayback hook
vi.mock('../../hooks/useAudioPlayback', () => ({
  default: () => ({
    isPlaying: false,
    isLooping: false,
    playbackPosition: 0,
    duration: 2.5,
    audioBuffer: null,
    togglePlayPause: vi.fn(),
    play: vi.fn(),
    stop: vi.fn(),
    toggleLoop: vi.fn(),
    seek: vi.fn(),
  }),
}));

// Mock audioCache
vi.mock('../../utils/audioCache', () => ({
  default: {
    get: vi.fn(() => null),
    set: vi.fn(),
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('SamplePlayer', () => {
  const mockSample: Sample = {
    id: 1,
    filename: 'test-sample.wav',
    filepath: '/path/to/test-sample.wav',
    folder_id: 1,
    tags: [],
    collections: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch to return a valid response
    (global.fetch as any) = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['audio data'], { type: 'audio/wav' })),
    });
  });

  describe('Visibility', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(
        <SamplePlayer sample={mockSample} isOpen={false} onClose={() => {}} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders player when isOpen is true', () => {
      render(<SamplePlayer sample={mockSample} isOpen={true} onClose={() => {}} />);
      expect(screen.getByText('test-sample.wav')).toBeInTheDocument();
    });
  });

  describe('Sample display', () => {
    it('displays sample filename when provided', () => {
      render(<SamplePlayer sample={mockSample} isOpen={true} onClose={() => {}} />);
      expect(screen.getByText('test-sample.wav')).toBeInTheDocument();
    });

    it('displays fallback text when sample is null', () => {
      render(<SamplePlayer sample={null} isOpen={true} onClose={() => {}} />);
      expect(screen.getByText('No sample loaded')).toBeInTheDocument();
    });
  });

  describe('Controls', () => {
    it('renders play/pause button', () => {
      render(<SamplePlayer sample={mockSample} isOpen={true} onClose={() => {}} />);
      const playButton = screen.getByTitle(/Play \(Space\)/);
      expect(playButton).toBeInTheDocument();
    });

    it('renders stop button', () => {
      render(<SamplePlayer sample={mockSample} isOpen={true} onClose={() => {}} />);
      const stopButton = screen.getByTitle('Stop and Reset to Beginning');
      expect(stopButton).toBeInTheDocument();
    });

    it('renders loop button', () => {
      render(<SamplePlayer sample={mockSample} isOpen={true} onClose={() => {}} />);
      const loopButton = screen.getByTitle('Toggle Loop');
      expect(loopButton).toBeInTheDocument();
    });

    it('renders close button', () => {
      render(<SamplePlayer sample={mockSample} isOpen={true} onClose={() => {}} />);
      const closeButton = screen.getByTitle('Close (Esc)');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Time display', () => {
    it('displays formatted time', () => {
      render(<SamplePlayer sample={mockSample} isOpen={true} onClose={() => {}} />);
      expect(screen.getByText('0:00')).toBeInTheDocument();
      expect(screen.getByText('0:02')).toBeInTheDocument(); // duration is 2.5s formatted
    });
  });

  describe('Interactions', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<SamplePlayer sample={mockSample} isOpen={true} onClose={onClose} />);

      const closeButton = screen.getByTitle('Close (Esc)');
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Ref API', () => {
    it('exposes toggleLoop via ref', () => {
      const ref = createRef<SamplePlayerRef>();

      render(<SamplePlayer ref={ref} sample={mockSample} isOpen={true} onClose={() => {}} />);

      expect(ref.current).not.toBeNull();
      expect(ref.current?.toggleLoop).toBeDefined();
      expect(typeof ref.current?.toggleLoop).toBe('function');
    });
  });

  describe('CSS classes', () => {
    it('applies overlay class', () => {
      const { container } = render(
        <SamplePlayer sample={mockSample} isOpen={true} onClose={() => {}} />
      );
      expect(container.querySelector('.sample-player-overlay')).toBeInTheDocument();
    });

    it('applies player class', () => {
      const { container } = render(
        <SamplePlayer sample={mockSample} isOpen={true} onClose={() => {}} />
      );
      expect(container.querySelector('.sample-player')).toBeInTheDocument();
    });
  });
});
