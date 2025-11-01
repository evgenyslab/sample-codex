import { useEffect, useRef } from 'react';

interface WaveformDisplayProps {
  audioBuffer: AudioBuffer | null;
  playbackPosition?: number;
  isPlaying?: boolean;
  onSeek?: (position: number) => void;
}

interface WaveformData {
  max: number;
}

/**
 * WaveformDisplay Component
 *
 * Renders an audio waveform on a canvas with a playback position indicator
 */
export default function WaveformDisplay({
  audioBuffer,
  playbackPosition = 0,
  isPlaying = false,
  onSeek
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const waveformDataRef = useRef<WaveformData[] | null>(null);

  // Generate waveform data from audio buffer
  useEffect(() => {
    if (!audioBuffer || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Get raw audio data
    const rawData = audioBuffer.getChannelData(0); // Use first channel
    const samples = width; // One sample per pixel width
    const blockSize = Math.floor(rawData.length / samples);
    const waveformData: WaveformData[] = [];

    // Downsample audio data to fit canvas width
    for (let i = 0; i < samples; i++) {
      const start = blockSize * i;
      let max = 0;

      for (let j = 0; j < blockSize; j++) {
        const val = Math.abs(rawData[start + j] || 0);
        max = Math.max(max, val);
      }

      // Use peak for visualization
      waveformData.push({ max });
    }

    waveformDataRef.current = waveformData;

    // Draw initial waveform
    drawWaveform(ctx, waveformData, width, height, 0);
  }, [audioBuffer]);

  // Redraw waveform with playback position
  useEffect(() => {
    if (!canvasRef.current || !waveformDataRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    drawWaveform(ctx, waveformDataRef.current, width, height, playbackPosition);
  }, [playbackPosition, isPlaying]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;

      const canvas = canvasRef.current;
      const container = containerRef.current;
      const dpr = window.devicePixelRatio || 1;

      // Set display size
      canvas.style.width = '100%';
      canvas.style.height = '80px';

      // Set actual size in memory (scaled for retina)
      canvas.width = container.clientWidth * dpr;
      canvas.height = 80 * dpr;

      // Scale context to match
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      // Trigger redraw
      if (audioBuffer && waveformDataRef.current && ctx) {
        drawWaveform(ctx, waveformDataRef.current, canvas.width, canvas.height, playbackPosition);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [audioBuffer, playbackPosition]);

  // Handle click to seek
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = x / rect.width;

    onSeek(Math.max(0, Math.min(1, position)));
  };

  return (
    <div ref={containerRef} className="waveform-container">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="waveform-canvas cursor-pointer"
      />
    </div>
  );
}

/**
 * Draw waveform on canvas
 */
function drawWaveform(
  ctx: CanvasRenderingContext2D,
  waveformData: WaveformData[],
  width: number,
  height: number,
  playbackPosition: number
) {
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = width / dpr;
  const displayHeight = height / dpr;

  // Clear canvas
  ctx.clearRect(0, 0, displayWidth, displayHeight);

  const middleY = displayHeight / 2;
  const playbackX = playbackPosition * displayWidth;

  // Draw waveform bars
  const barWidth = displayWidth / waveformData.length;

  for (let i = 0; i < waveformData.length; i++) {
    const x = i * barWidth;
    const data = waveformData[i];
    if (!data) continue;
    const { max } = data;

    // Use max for height
    const barHeight = max * middleY * 0.9;

    // Different color for played vs unplayed with high contrast
    if (x < playbackX) {
      // Bright cyan/blue for played portion
      ctx.fillStyle = '#00D9FF';
    } else {
      // Medium gray for unplayed portion
      ctx.fillStyle = 'rgba(var(--text-rgb), 0.5)';
    }

    // Draw centered bar
    ctx.fillRect(x, middleY - barHeight, barWidth - 1, barHeight * 2);
  }

  // Draw playback position indicator
  if (playbackPosition > 0) {
    ctx.strokeStyle = '#FF0000'; // Bright red for high contrast
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(playbackX, 0);
    ctx.lineTo(playbackX, displayHeight);
    ctx.stroke();
  }

  // Draw center line
  ctx.strokeStyle = 'rgba(var(--text-rgb), 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, middleY);
  ctx.lineTo(displayWidth, middleY);
  ctx.stroke();
}
