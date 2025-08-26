// Direct implementation to avoid dynamic import issues
console.log('🔄 Initializing store...');

// Type definitions
export interface MCardContent {
  type: string;
  data: any;
  metadata?: Record<string, unknown>;
}

export interface MCardSelectionState {
  hash: string | null;
  title: string | null;
  gTime: string | null;
  contentType: string | null;
  content: MCardContent | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

export interface AppState {
  mcardSelection: MCardSelectionState;
}

// Create a simple store
const createSimpleStore = () => {
  const initialState: AppState = {
    mcardSelection: {
      hash: null,
      title: null,
      gTime: null,
      contentType: null,
      content: null,
      status: 'idle',
      error: null
    }
  };

  let state: AppState = JSON.parse(JSON.stringify(initialState));
  const listeners: (() => void)[] = [];

  const subscribe = (listener: () => void) => {
    listeners.push(listener);
    listener(); // Immediately notify
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  };

  const dispatch = (action: { type: string; payload?: any }) => {
    console.log('📡 Dispatching action:', action);
    
    switch (action.type) {
      case 'mcardSelection/setSelectedMCard':
        state.mcardSelection = {
          ...state.mcardSelection,
          ...action.payload,
          status: 'succeeded',
          error: null
        };
        break;
        
      case 'mcardSelection/setLoading':
        state.mcardSelection = {
          ...state.mcardSelection,
          status: 'loading',
          error: null
        };
        break;
        
      case 'mcardSelection/setError':
        state.mcardSelection = {
          ...state.mcardSelection,
          status: 'failed',
          error: action.payload.error || 'Unknown error occurred'
        };
        break;
        
      case 'mcardSelection/clearSelectedMCard':
        state.mcardSelection = {
          ...initialState.mcardSelection
        };
        break;
        
      default:
        console.warn('Unknown action type:', action.type);
        return state;
    }
    
    console.log('📊 Updated state:', state);
    listeners.forEach(listener => listener());
    return state;
  };

  const getState = () => state;

  // Action creators
  const actions = {
    setSelectedMCard: (payload: Partial<MCardSelectionState>) => ({
      type: 'mcardSelection/setSelectedMCard',
      payload
    }),
    setLoading: () => ({
      type: 'mcardSelection/setLoading'
    }),
    setError: (error: string) => ({
      type: 'mcardSelection/setError',
      payload: { error }
    }),
    clearSelectedMCard: () => ({
      type: 'mcardSelection/clearSelectedMCard'
    })
  };

  return {
    subscribe,
    dispatch,
    getState,
    actions
  };
};

// Create and export the store
export const store = createSimpleStore();

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export interface AppStore {
  dispatch: typeof store.dispatch;
  getState: typeof store.getState;
  subscribe: typeof store.subscribe;
  actions: typeof store.actions;
}

// Expose to window for debugging
declare global {
  interface Window {
    reduxStore: AppStore;
  }
}

// Only expose to window in browser environment
if (typeof window !== 'undefined') {
  window.reduxStore = store;
  console.log('✅ Store initialized with state:', store.getState());
  
  // Dispatch ready event
  const onReady = () => {
    console.log('🚀 Store ready');
    window.dispatchEvent(new CustomEvent('redux-store-ready', {
      detail: { store }
    }));
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    setTimeout(onReady, 0);
  }
}

export default store;
