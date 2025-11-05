import { useState, useEffect, useCallback, useImperativeHandle, forwardRef, Ref, useRef } from 'react';
import { Play, Square, X } from 'lucide-react';
import WaveformDisplay from './WaveformDisplay';
import useAudioPlayback from '../../hooks/useAudioPlayback';
import audioCache from '../../utils/audioCache';
import { useAudioPlayer } from '../../contexts/AudioPlayerContext';
import type { Sample } from '../../types';
import './SamplePlayer.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface SamplePlayerProps {
  sample: Sample | null;
  isOpen: boolean;
  onClose: () => void;
}

export interface SamplePlayerRef {
  toggleLoop: () => void;
  restart: () => void;
  stop: () => void;
}

/**
 * SamplePlayer Component
 *
 * Reusable audio sample player with waveform visualization
 */
const SamplePlayer = forwardRef<SamplePlayerRef, SamplePlayerProps>(
  ({ sample, isOpen, onClose }, ref: Ref<SamplePlayerRef>) => {
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
    const expectedSampleIdRef = useRef<number | null>(null);
    const isRestartingRef = useRef(false);

    // Get global audio player context
    const { isLoopEnabled, setIsPlaying: setGlobalIsPlaying, toggleLoop: globalToggleLoop, isAutoPlayEnabled } = useAudioPlayer();

    const {
      isPlaying,
      isLooping,
      playbackPosition,
      duration,
      audioBuffer,
      play,
      stop,
      toggleLoop: localToggleLoop,
    } = useAudioPlayback(audioBlob);

    // Sync local playing state to global context
    useEffect(() => {
      setGlobalIsPlaying(isPlaying);
    }, [isPlaying, setGlobalIsPlaying]);

    // Sync global loop state to local player
    useEffect(() => {
      // Only update if different to avoid infinite loops
      if (isLooping !== isLoopEnabled) {
        localToggleLoop();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoopEnabled]); // Intentionally omitting isLooping and localToggleLoop to avoid loops

    // Restart function - stops and immediately plays from beginning
    const restart = useCallback(() => {
      // Prevent concurrent restarts
      if (isRestartingRef.current) {
        console.log('Restart already in progress, ignoring...');
        return;
      }

      isRestartingRef.current = true;
      console.log('Restarting playback...');

      // Stop current playback
      stop();

      // Wait a bit longer to ensure stop() completes and audio nodes are disconnected
      setTimeout(() => {
        play();
        isRestartingRef.current = false;
      }, 50);
    }, [stop, play]);

    // Expose functions to parent via ref
    useImperativeHandle(ref, () => ({
      toggleLoop: globalToggleLoop,
      restart,
      stop
    }));

    // Track when sample changes - stop current audio and decide whether to auto-play
    useEffect(() => {
      if (sample && isOpen) {
        // Always stop current audio when sample changes (even if not playing)
        console.log('Sample changed to:', sample.id, sample.filename);
        stop();

        // Track which sample we're expecting to load
        expectedSampleIdRef.current = sample.id;

        // Clear the shouldAutoPlay flag immediately to prevent auto-playing with old buffer
        setShouldAutoPlay(false);

        // Decide whether to auto-play the new sample after it loads
        if (isAutoPlayEnabled) {
          console.log('AutoPlay is enabled - will auto-play sample', sample.id, 'after load');
          // Set flag that will trigger play once new audioBuffer is ready
          setShouldAutoPlay(true);
        } else {
          console.log('AutoPlay is disabled - sample', sample.id, 'will load but not play');
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sample?.id]);

    // Load audio when sample changes
    useEffect(() => {
      if (!sample || !isOpen) {
        setAudioBlob(null);
        setError(null);
        return;
      }

      const loadAudio = async () => {
        setIsLoading(true);
        setError(null);

        try {
          console.log('Loading audio for sample:', sample.id, sample.filename);

          // Check cache first
          let blob = audioCache.get(sample.id);

          if (!blob) {
            console.log('Audio not in cache, fetching from backend...');
            // Fetch from backend
            const response = await fetch(`${API_BASE_URL}/samples/${sample.id}/audio`);

            if (!response.ok) {
              throw new Error(`Failed to load audio: ${response.statusText}`);
            }

            blob = await response.blob();
            console.log('Audio fetched:', blob.size, 'bytes, type:', blob.type);

            // Cache the audio
            audioCache.set(sample.id, blob);
          } else {
            console.log('Audio loaded from cache:', blob.size, 'bytes');
          }

          setAudioBlob(blob);
        } catch (err) {
          console.error('Error loading audio:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
          setIsLoading(false);
        }
      };

      loadAudio();
    }, [sample, isOpen]);

    // Auto-play when new audio buffer is ready if shouldAutoPlay is set
    useEffect(() => {
      // Only auto-play if:
      // 1. shouldAutoPlay flag is set
      // 2. We have an audio buffer
      // 3. The current sample matches the expected sample (prevents playing stale buffer)
      if (shouldAutoPlay && audioBuffer && sample?.id === expectedSampleIdRef.current) {
        console.log('Auto-playing sample', sample.id, '(seamless transition)');
        // Add a small delay to ensure previous audio is fully stopped and disconnected
        const timeoutId = setTimeout(() => {
          play();
          setShouldAutoPlay(false);
        }, 50);

        return () => clearTimeout(timeoutId);
      }
    }, [audioBuffer, shouldAutoPlay, play, sample?.id]);

    // Toggle between play and stop
    const togglePlayStop = useCallback(() => {
      if (isPlaying) {
        stop();
      } else {
        play();
      }
    }, [isPlaying, play, stop]);

    // Keyboard shortcuts
    useEffect(() => {
      if (!isOpen) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        // Ignore if user is typing in an input
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }

        if (e.code === 'Space') {
          e.preventDefault();
          togglePlayStop();
        } else if (e.code === 'Escape') {
          e.preventDefault();
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, togglePlayStop, onClose]);

    // Format time display
    const formatTime = useCallback((seconds: number) => {
      if (!seconds || isNaN(seconds)) return '0:00';

      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    if (!isOpen) return null;

    return (
      <div className="sample-player-overlay">
        <div className="sample-player">
          {/* Header */}
          <div className="sample-player-header">
            <div className="sample-info">
              <h3 className="sample-filename">{sample?.filename || 'No sample loaded'}</h3>
            </div>
            <button className="close-button" onClick={onClose} title="Close (Esc)">
              <X size={16} />
            </button>
          </div>

          {/* Controls */}
          <div className="sample-player-controls">
            <button
              className="control-button"
              onClick={togglePlayStop}
              disabled={isLoading || !audioBlob}
              title={isPlaying ? 'Stop (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Square size={18} /> : <Play size={18} />}
            </button>

            <div className="time-display">
              <span>{formatTime(playbackPosition * duration)}</span>
              <span className="time-separator">/</span>
              <span>{formatTime(duration)}</span>
              {import.meta.env.DEV && (
                <span className="ml-2 text-xs">
                  [{isPlaying ? 'PLAYING' : 'STOPPED'}]
                  {audioBuffer ? ' [BUFFER OK]' : ' [NO BUFFER]'}
                </span>
              )}
            </div>
          </div>

          {/* Waveform */}
          <div className="waveform-wrapper">
            {isLoading && <div className="loading-message">Loading audio...</div>}
            {error && <div className="error-message">Error: {error}</div>}
            {!isLoading && !error && audioBuffer && (
              <WaveformDisplay
                audioBuffer={audioBuffer}
                playbackPosition={playbackPosition}
                isPlaying={isPlaying}
              />
            )}
            {!isLoading && !error && !audioBuffer && (
              <div className="empty-message">No audio loaded</div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

SamplePlayer.displayName = 'SamplePlayer';

export default SamplePlayer;
