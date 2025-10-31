import { useState, useEffect, useRef, useCallback } from 'react';
import { getAudioContext, resetAudioContext } from '../utils/audioContext';

/**
 * Audio playback hook
 *
 * Manages audio playback state and controls using Web Audio API
 *
 * @param {Blob|null} audioBlob - The audio blob to play
 * @returns {Object} Playback state and controls
 */
export default function useAudioPlayback(audioBlob) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioBuffer, setAudioBuffer] = useState(null);

  const sourceNodeRef = useRef(null);
  const gainNodeRef = useRef(null);
  const startTimeRef = useRef(0);
  const pauseTimeRef = useRef(0);
  const animationFrameRef = useRef(null);

  // Load audio blob and decode
  useEffect(() => {
    if (!audioBlob) {
      setAudioBuffer(null);
      setDuration(0);
      return;
    }

    const loadAudio = async () => {
      try {
        console.log('Decoding audio blob...');
        const audioContext = getAudioContext();
        const arrayBuffer = await audioBlob.arrayBuffer();
        console.log('ArrayBuffer size:', arrayBuffer.byteLength);

        const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log('Audio decoded successfully:', {
          duration: decodedBuffer.duration,
          channels: decodedBuffer.numberOfChannels,
          sampleRate: decodedBuffer.sampleRate
        });

        setAudioBuffer(decodedBuffer);
        setDuration(decodedBuffer.duration);
        setPlaybackPosition(0);
      } catch (error) {
        console.error('Error decoding audio:', error);
      }
    };

    loadAudio();

    // Stop playback when new audio loads
    return () => {
      // Stop current playback
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }
      setIsPlaying(false);
      setPlaybackPosition(0);
      pauseTimeRef.current = 0;
    };
  }, [audioBlob]);

  // Update playback position during playback
  const updatePosition = useCallback(() => {
    const audioContext = getAudioContext();
    if (!isPlaying || !duration) return;

    const elapsed = audioContext.currentTime - startTimeRef.current + pauseTimeRef.current;
    const position = elapsed / duration;

    if (import.meta.env.DEV && Math.random() < 0.01) {
      console.log('Position update:', { elapsed, duration, position: position.toFixed(3) });
    }

    if (position >= 1 && !isLooping) {
      // Playback finished
      setIsPlaying(false);
      setPlaybackPosition(0);
      pauseTimeRef.current = 0;
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch (e) {
          // Ignore
        }
        sourceNodeRef.current = null;
      }
      return;
    }

    setPlaybackPosition(isLooping ? position % 1 : Math.min(position, 1));
    animationFrameRef.current = requestAnimationFrame(updatePosition);
  }, [isPlaying, duration, isLooping]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updatePosition);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updatePosition]);

  /**
   * Play audio from current position
   */
  const play = useCallback(async () => {
    if (!audioBuffer) {
      console.log('Play failed: no audio buffer');
      return;
    }

    // Get global audio context
    let audioContext = getAudioContext();

    // Check if context is in a bad state and needs reset
    if (audioContext.state === 'closed') {
      console.warn('⚠️ AudioContext was closed, resetting...');
      audioContext = resetAudioContext();

      // Need to re-decode audio with new context
      console.log('Re-decoding audio with new context...');
      // For now, user will need to click again - in production you'd want to handle this
      return;
    }

    // Resume audio context if suspended (browsers require user interaction)
    if (audioContext.state === 'suspended') {
      console.log('Resuming suspended audio context...');
      try {
        await audioContext.resume();
        console.log('Audio context state:', audioContext.state);
      } catch (e) {
        console.error('Failed to resume context:', e);
        return;
      }
    }

    // Stop existing source
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    // Create or reuse gain node (recreate if context changed)
    try {
      if (!gainNodeRef.current || gainNodeRef.current.context !== audioContext) {
        gainNodeRef.current = audioContext.createGain();
        gainNodeRef.current.gain.value = 1.0;
        gainNodeRef.current.connect(audioContext.destination);
        console.log('Gain node created and connected to destination');
      }
    } catch (e) {
      console.error('Failed to create gain node:', e);
      return;
    }

    // Create new source
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = isLooping;

    // Connect: source -> gain -> destination
    source.connect(gainNodeRef.current);
    console.log('Audio chain: source -> gain -> destination');

    // Start from pause position
    const offset = pauseTimeRef.current % duration;
    console.log('Starting playback:', {
      duration,
      offset,
      loop: isLooping,
      contextState: audioContext.state,
      contextTime: audioContext.currentTime,
      sampleRate: audioContext.sampleRate,
      destination: audioContext.destination.channelCount + ' channels',
      gainValue: gainNodeRef.current.gain.value
    });

    source.start(0, offset);
    console.log('source.start() called successfully - audio should be playing!');

    // Check if audio is actually flowing
    setTimeout(() => {
      if (audioContext.state !== 'running') {
        console.warn('AudioContext not running after start!', audioContext.state);
      } else {
        console.log('AudioContext confirmed running');
      }
    }, 100);

    sourceNodeRef.current = source;
    startTimeRef.current = audioContext.currentTime - pauseTimeRef.current;
    setIsPlaying(true);
    console.log('Playback state set to true');

    // Handle ended event (for non-looping playback)
    source.onended = () => {
      if (!isLooping) {
        setIsPlaying(false);
        setPlaybackPosition(0);
        pauseTimeRef.current = 0;
        sourceNodeRef.current = null;
      }
    };
  }, [audioBuffer, isLooping, duration]);

  /**
   * Pause audio
   */
  const pause = useCallback(() => {
    if (!sourceNodeRef.current) return;

    const audioContext = getAudioContext();
    const elapsed = audioContext.currentTime - startTimeRef.current + pauseTimeRef.current;
    pauseTimeRef.current = elapsed % duration;

    try {
      sourceNodeRef.current.stop();
    } catch (e) {
      // Ignore if already stopped
    }
    sourceNodeRef.current = null;
    setIsPlaying(false);
  }, [duration]);

  /**
   * Stop audio and reset position
   * If already stopped but paused mid-play, resets to beginning
   */
  const stop = useCallback(() => {
    // Stop audio source if playing
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      sourceNodeRef.current = null;
    }

    // Always reset to beginning
    setIsPlaying(false);
    setPlaybackPosition(0);
    pauseTimeRef.current = 0;
  }, []);

  /**
   * Toggle play/pause
   */
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  /**
   * Toggle loop mode
   */
  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => {
      const newLooping = !prev;

      // Update existing source if playing
      if (sourceNodeRef.current) {
        sourceNodeRef.current.loop = newLooping;
      }

      return newLooping;
    });
  }, []);

  /**
   * Seek to position (0-1)
   */
  const seek = useCallback(
    (position) => {
      if (!duration) return;

      const wasPlaying = isPlaying;
      const targetTime = position * duration;

      // Stop current playback
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current = null;
      }

      pauseTimeRef.current = targetTime;
      setPlaybackPosition(position);

      // Resume if was playing
      if (wasPlaying) {
        play();
      }
    },
    [duration, isPlaying, play]
  );

  return {
    // State
    isPlaying,
    isLooping,
    playbackPosition,
    duration,
    audioBuffer,

    // Controls
    play,
    pause,
    stop,
    togglePlayPause,
    toggleLoop,
    seek,
  };
}
