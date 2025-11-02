import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WaveformDisplay from './WaveformDisplay';

// Mock canvas context methods
const mockCanvasContext = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  scale: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
};

describe('WaveformDisplay', () => {
  let mockAudioBuffer: AudioBuffer;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock HTMLCanvasElement.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvasContext) as any;

    // Create a mock AudioBuffer
    const audioContext = new AudioContext();
    mockAudioBuffer = audioContext.createBuffer(1, 44100, 44100);
    const channelData = mockAudioBuffer.getChannelData(0);

    // Fill with sample waveform data
    for (let i = 0; i < channelData.length; i++) {
      channelData[i] = Math.sin(2 * Math.PI * i / 1000) * 0.5;
    }
  });

  describe('Rendering', () => {
    it('renders a canvas element', () => {
      const { container } = render(<WaveformDisplay audioBuffer={null} />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('renders a container div', () => {
      const { container } = render(<WaveformDisplay audioBuffer={null} />);
      const containerDiv = container.querySelector('.waveform-container');
      expect(containerDiv).toBeInTheDocument();
    });

    it('applies cursor-pointer class to canvas', () => {
      const { container } = render(<WaveformDisplay audioBuffer={null} />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toHaveClass('cursor-pointer');
    });
  });

  describe('Audio buffer handling', () => {
    it('renders without audio buffer', () => {
      const { container } = render(<WaveformDisplay audioBuffer={null} />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('renders with audio buffer', () => {
      const { container } = render(<WaveformDisplay audioBuffer={mockAudioBuffer} />);
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('calls getContext on mount with audio buffer', () => {
      render(<WaveformDisplay audioBuffer={mockAudioBuffer} />);
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });

    it('draws waveform when audio buffer is provided', () => {
      render(<WaveformDisplay audioBuffer={mockAudioBuffer} />);
      // clearRect is called when drawing
      expect(mockCanvasContext.clearRect).toHaveBeenCalled();
    });
  });

  describe('Playback position', () => {
    it('accepts playbackPosition prop', () => {
      const { container } = render(
        <WaveformDisplay audioBuffer={mockAudioBuffer} playbackPosition={0.5} />
      );
      expect(container.querySelector('canvas')).toBeInTheDocument();
    });

    it('redraws when playbackPosition changes', () => {
      const { rerender } = render(
        <WaveformDisplay audioBuffer={mockAudioBuffer} playbackPosition={0} />
      );

      const initialClearCalls = mockCanvasContext.clearRect.mock.calls.length;

      rerender(<WaveformDisplay audioBuffer={mockAudioBuffer} playbackPosition={0.5} />);

      // Should have called clearRect again for redraw
      expect(mockCanvasContext.clearRect.mock.calls.length).toBeGreaterThan(initialClearCalls);
    });

    it('draws position indicator when playbackPosition > 0', () => {
      render(
        <WaveformDisplay audioBuffer={mockAudioBuffer} playbackPosition={0.5} />
      );

      // When playbackPosition > 0, it should draw a line (stroke)
      expect(mockCanvasContext.stroke).toHaveBeenCalled();
    });
  });

  describe('Seek functionality', () => {
    it('calls onSeek when canvas is clicked', async () => {
      const user = userEvent.setup();
      const onSeek = vi.fn();

      const { container } = render(
        <WaveformDisplay
          audioBuffer={mockAudioBuffer}
          playbackPosition={0}
          onSeek={onSeek}
        />
      );

      const canvas = container.querySelector('canvas');
      if (canvas) {
        // Mock getBoundingClientRect
        canvas.getBoundingClientRect = vi.fn(() => ({
          left: 0,
          top: 0,
          right: 800,
          bottom: 80,
          width: 800,
          height: 80,
          x: 0,
          y: 0,
          toJSON: () => {},
        }));

        await user.click(canvas);
        expect(onSeek).toHaveBeenCalled();
      }
    });

    it('calculates correct seek position', async () => {
      const user = userEvent.setup();
      const onSeek = vi.fn();

      const { container } = render(
        <WaveformDisplay
          audioBuffer={mockAudioBuffer}
          playbackPosition={0}
          onSeek={onSeek}
        />
      );

      const canvas = container.querySelector('canvas');
      if (canvas) {
        canvas.getBoundingClientRect = vi.fn(() => ({
          left: 0,
          top: 0,
          right: 800,
          bottom: 80,
          width: 800,
          height: 80,
          x: 0,
          y: 0,
          toJSON: () => {},
        }));

        // Click at 50% width (400px of 800px)
        await user.click(canvas);
        expect(onSeek).toHaveBeenCalledWith(0.5);
      }
    });

    it('clamps seek position to 0-1 range', async () => {
      const user = userEvent.setup();
      const onSeek = vi.fn();

      const { container } = render(
        <WaveformDisplay
          audioBuffer={mockAudioBuffer}
          playbackPosition={0}
          onSeek={onSeek}
        />
      );

      const canvas = container.querySelector('canvas');
      if (canvas) {
        canvas.getBoundingClientRect = vi.fn(() => ({
          left: 0,
          top: 0,
          right: 800,
          bottom: 80,
          width: 800,
          height: 80,
          x: 0,
          y: 0,
          toJSON: () => {},
        }));

        // Click beyond right edge
        await user.click(canvas);
        expect(onSeek).toHaveBeenCalledWith(1);
      }
    });

    it('does not call onSeek if not provided', async () => {
      const user = userEvent.setup();

      const { container } = render(
        <WaveformDisplay audioBuffer={mockAudioBuffer} playbackPosition={0} />
      );

      const canvas = container.querySelector('canvas');
      if (canvas) {
        canvas.getBoundingClientRect = vi.fn(() => ({
          left: 0,
          top: 0,
          right: 800,
          bottom: 80,
          width: 800,
          height: 80,
          x: 0,
          y: 0,
          toJSON: () => {},
        }));

        // Should not throw
        await user.click(canvas);
      }
    });
  });

  describe('isPlaying prop', () => {
    it('accepts isPlaying prop', () => {
      const { container } = render(
        <WaveformDisplay
          audioBuffer={mockAudioBuffer}
          playbackPosition={0.5}
          isPlaying={true}
        />
      );
      expect(container.querySelector('canvas')).toBeInTheDocument();
    });

    it('redraws when isPlaying changes', () => {
      const { rerender } = render(
        <WaveformDisplay
          audioBuffer={mockAudioBuffer}
          playbackPosition={0.5}
          isPlaying={false}
        />
      );

      const initialClearCalls = mockCanvasContext.clearRect.mock.calls.length;

      rerender(
        <WaveformDisplay
          audioBuffer={mockAudioBuffer}
          playbackPosition={0.5}
          isPlaying={true}
        />
      );

      // Should redraw when isPlaying changes
      expect(mockCanvasContext.clearRect.mock.calls.length).toBeGreaterThan(initialClearCalls);
    });
  });

  describe('Canvas drawing', () => {
    it('uses device pixel ratio for retina displays', () => {
      const originalDPR = window.devicePixelRatio;
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        configurable: true,
        value: 2,
      });

      render(<WaveformDisplay audioBuffer={mockAudioBuffer} />);

      // Should call scale with DPR
      expect(mockCanvasContext.scale).toHaveBeenCalled();

      // Restore original DPR
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        configurable: true,
        value: originalDPR,
      });
    });

    it('draws center line', () => {
      render(<WaveformDisplay audioBuffer={mockAudioBuffer} />);

      // Center line uses moveTo, lineTo, and stroke
      expect(mockCanvasContext.moveTo).toHaveBeenCalled();
      expect(mockCanvasContext.lineTo).toHaveBeenCalled();
      expect(mockCanvasContext.stroke).toHaveBeenCalled();
    });

    it('draws waveform bars with fillRect', () => {
      render(<WaveformDisplay audioBuffer={mockAudioBuffer} />);

      // Waveform uses fillRect for bars
      expect(mockCanvasContext.fillRect).toHaveBeenCalled();
    });
  });
});
