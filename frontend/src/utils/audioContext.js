/**
 * Global AudioContext singleton
 *
 * This ensures we only create one AudioContext that persists
 * across component re-renders and React StrictMode double-mounting.
 */

let globalAudioContext = null;

export const getAudioContext = () => {
  if (!globalAudioContext || globalAudioContext.state === 'closed') {
    globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    console.log('🔊 Global AudioContext created:', {
      state: globalAudioContext.state,
      sampleRate: globalAudioContext.sampleRate,
      destination: globalAudioContext.destination,
      baseLatency: globalAudioContext.baseLatency
    });
  } else {
    console.log('🔊 Reusing existing AudioContext:', globalAudioContext.state);
  }
  return globalAudioContext;
};

export const resumeAudioContext = async () => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    console.log('Resuming suspended audio context...');
    await ctx.resume();
    console.log('Audio context state:', ctx.state);
  }
  return ctx;
};
