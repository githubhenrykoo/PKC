import { configureStore, combineReducers } from '@reduxjs/toolkit';

import { authReducer, uiReducer, dataReducer } from './slices';

// Root reducer combining all slices
const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
  data: dataReducer,
});

// Configure store with Redux Toolkit (without persistence for now to avoid SSR issues)
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore File objects in upload queue
        ignoredPaths: ['data.uploads.queue'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Create a simple persistor mock for components that expect it
export const persistor = {
  purge: () => Promise.resolve(),
  flush: () => Promise.resolve(),
  pause: () => {},
  persist: () => {},
  getState: () => ({ bootstrapped: true }),
  subscribe: () => () => {},
};

// Export types for use throughout the app
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export everything from store structure following our rules
export * from './types';
export * from './slices';
export * from './selectors';
