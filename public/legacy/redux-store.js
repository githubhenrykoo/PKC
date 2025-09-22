// Simple Redux Store for MCard Selection
console.log('🔄 Initializing simple Redux store...');

// Create a simple store alternative
const simpleStore = {
  state: {
    mcardSelection: {
      hash: null,
      title: null,
      gTime: null,
      contentType: null
    }
  },
  listeners: [],
  subscribe: function(listener) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  },
  dispatch: function(action) {
    console.log('📡 Dispatching action:', action);
    if (action.type === 'mcardSelection/setSelectedMCard') {
      this.state.mcardSelection = {
        hash: action.payload.hash,
        title: action.payload.title,
        gTime: action.payload.gTime || null,
        contentType: action.payload.contentType || null
      };
      console.log('📊 Updated state:', this.state);
      this.listeners.forEach(listener => listener());
    } else if (action.type === 'mcardSelection/clearSelectedMCard') {
      this.state.mcardSelection = {
        hash: null,
        title: null,
        gTime: null,
        contentType: null
      };
      this.listeners.forEach(listener => listener());
    }
  },
  getState: function() {
    return this.state;
  }
};

// Expose to window
window.reduxStore = simpleStore;

console.log('✅ Simple Redux store initialized and attached to window');
console.log('📊 Initial state:', simpleStore.getState());

// Dispatch ready event
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.dispatchEvent(new CustomEvent('redux-store-ready'));
    console.log('🚀 Redux store ready event dispatched');
  });
} else {
  // DOM already loaded
  window.dispatchEvent(new CustomEvent('redux-store-ready'));
  console.log('🚀 Redux store ready event dispatched (DOM already loaded)');
}
