/**
 * Global AudioContext singleton with recovery mechanisms
 *
 * This ensures we only create one AudioContext that persists
 * across component re-renders, system sleep/wake, and tab visibility changes.
 */

let globalAudioContext = null;
let isRecovering = false;

export const getAudioContext = () => {
  if (!globalAudioContext || globalAudioContext.state === 'closed') {
    globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    console.log('🔊 Global AudioContext created:', {
      state: globalAudioContext.state,
      sampleRate: globalAudioContext.sampleRate,
      destination: globalAudioContext.destination,
      baseLatency: globalAudioContext.baseLatency
    });

    // Set up recovery mechanisms
    setupRecoveryListeners();
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

/**
 * Force recreate the AudioContext (for stuck states)
 */
export const resetAudioContext = () => {
  console.warn('🔄 Resetting AudioContext...');

  if (globalAudioContext) {
    try {
      if (globalAudioContext.state !== 'closed') {
        globalAudioContext.close();
      }
    } catch (e) {
      console.warn('Error closing old context:', e);
    }
  }

  globalAudioContext = null;
  const newContext = getAudioContext();
  console.log('✅ AudioContext reset complete:', newContext.state);

  return newContext;
};

/**
 * Set up listeners for system sleep/wake and visibility changes
 */
function setupRecoveryListeners() {
  if (typeof window === 'undefined') return;

  // Handle page visibility changes (tab switching, system wake)
  document.addEventListener('visibilitychange', async () => {
    if (!globalAudioContext || isRecovering) return;

    if (document.visibilityState === 'visible') {
      console.log('📱 Page became visible, checking AudioContext...');
      isRecovering = true;

      try {
        // Check if context is in a bad state
        if (globalAudioContext.state === 'suspended') {
          console.log('⚠️ AudioContext suspended after wake, resuming...');
          await globalAudioContext.resume();
          console.log('✅ AudioContext resumed:', globalAudioContext.state);
        } else if (globalAudioContext.state === 'closed') {
          console.log('⚠️ AudioContext closed after wake, resetting...');
          resetAudioContext();
        } else {
          console.log('✅ AudioContext OK:', globalAudioContext.state);
        }
      } catch (e) {
        console.error('❌ Failed to recover AudioContext:', e);
      } finally {
        isRecovering = false;
      }
    }
  });

  // Handle focus events (additional recovery trigger)
  window.addEventListener('focus', async () => {
    if (!globalAudioContext || isRecovering) return;

    // Small delay to let system audio catch up
    setTimeout(async () => {
      if (globalAudioContext.state === 'suspended') {
        console.log('🔄 Window focused, resuming AudioContext...');
        try {
          await globalAudioContext.resume();
        } catch (e) {
          console.error('Failed to resume on focus:', e);
        }
      }
    }, 100);
  });

  console.log('🎧 Audio recovery listeners installed');
}

// Install listeners immediately if window is available
if (typeof window !== 'undefined') {
  setupRecoveryListeners();
}
