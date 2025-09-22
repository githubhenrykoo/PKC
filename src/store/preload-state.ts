// Simple shared state to manage MCard preloading status

interface PreloadState {
  isPreloadComplete: boolean;
  listeners: (() => void)[];
}

// Attach state to the global window object to be accessible across modules
const global = window as any;
global.pkcPreloadState = global.pkcPreloadState || {
  isPreloadComplete: false,
  listeners: [],
};

const state: PreloadState = global.pkcPreloadState;

export function setPreloadComplete() {
  if (state.isPreloadComplete) return;
  console.log('🏁 Preload process complete. Notifying listeners.');
  state.isPreloadComplete = true;
  state.listeners.forEach(cb => cb());
  state.listeners = []; // Clear listeners after notifying
}

export function waitForPreload(timeoutMs: number = 5000): Promise<void> {
  return new Promise(resolve => {
    if (state.isPreloadComplete) {
      resolve();
    } else {
      // Add timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        console.log('⏰ Preload wait timeout, proceeding without preload');
        resolve();
      }, timeoutMs);
      
      const wrappedResolve = () => {
        clearTimeout(timeoutId);
        resolve();
      };
      
      state.listeners.push(wrappedResolve);
    }
  });
}
