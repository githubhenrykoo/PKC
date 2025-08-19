import { configureStore } from '@reduxjs/toolkit';
import mcardReducer from './mcardSlice';

export const store = configureStore({
  reducer: {
    mcardSelection: mcardReducer,
  },
});

// Expose the store to the window for use in Astro components
if (typeof window !== 'undefined') {
  (window as any).reduxStore = store;
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
