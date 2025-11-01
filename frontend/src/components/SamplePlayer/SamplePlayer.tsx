import { useState, useEffect, useCallback, useImperativeHandle, forwardRef, Ref } from 'react';
import { Play, Pause, Square, X } from 'lucide-react';
import WaveformDisplay from './WaveformDisplay';
import useAudioPlayback from '../../hooks/useAudioPlayback';
import audioCache from '../../utils/audioCache';
import { useAudioPlayer } from '../../contexts/AudioPlayerContext';
import type { Sample } from '../../types';
import './SamplePlayer.css';

interface SamplePlayerProps {
  sample: Sample | null;
  isOpen: boolean;
  onClose: () => void;
}

export interface SamplePlayerRef {
  toggleLoop: () => void;
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

    // Get global audio player context
    const { isLoopEnabled, setIsPlaying: setGlobalIsPlaying, toggleLoop: globalToggleLoop } = useAudioPlayer();

    const {
      isPlaying,
      isLooping,
      playbackPosition,
      duration,
      audioBuffer,
      togglePlayPause,
      play,
      stop,
      toggleLoop: localToggleLoop,
      seek,
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
    }, [isLoopEnabled]); // Intentionally omitting isLooping and localToggleLoop to avoid loops

    // Expose toggleLoop to parent via ref - now calls global context
    useImperativeHandle(ref, () => ({
      toggleLoop: globalToggleLoop
    }));

    // Track when sample changes while playing - set autoplay flag
    useEffect(() => {
      if (sample && isOpen && isPlaying) {
        console.log('Sample changed while playing - will auto-play next sample');
        setShouldAutoPlay(true);
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
            const response = await fetch(`http://localhost:8000/api/samples/${sample.id}/audio`);

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
      if (shouldAutoPlay && audioBuffer && !isPlaying) {
        console.log('Auto-playing new sample (seamless transition)');
        play();
        setShouldAutoPlay(false);
      }
    }, [audioBuffer, shouldAutoPlay, isPlaying, play]);

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
          togglePlayPause();
        } else if (e.code === 'Escape') {
          e.preventDefault();
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, togglePlayPause, onClose]);

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
              onClick={togglePlayPause}
              disabled={isLoading || !audioBlob}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>

            <button
              className="control-button"
              onClick={stop}
              disabled={!isPlaying && playbackPosition === 0}
              title="Stop and Reset to Beginning"
            >
              <Square size={18} />
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
                onSeek={seek}
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
