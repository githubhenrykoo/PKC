import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, createTransform } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import { authReducer, uiReducer, dataReducer } from './slices';
import type { AuthState } from './types/auth';

// Security transform to exclude sensitive data from persistence
const authTransform = createTransform(
  // Transform state before persisting
  (inboundState: AuthState) => ({
    ...inboundState,
    // Remove sensitive tokens from persistence for security
    tokens: null,
    error: null, // Don't persist errors
  }),
  // Transform state after rehydrating
  (outboundState: AuthState) => ({
    ...outboundState,
    isLoading: false, // Reset loading state on rehydration
  }),
  { whitelist: ['auth'] }
);

// Persist configuration following our Redux rules
const persistConfig = {
  key: 'pkc-root',
  storage,
  whitelist: ['auth'], // Only persist auth state
  blacklist: ['ui', 'data'], // Never persist UI or data state
  transforms: [authTransform],
};

// Root reducer combining all slices
const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
  data: dataReducer,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store with Redux Toolkit
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist actions
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
        ],
        // Ignore File objects in upload queue
        ignoredPaths: ['data.uploads.queue'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Create persistor
export const persistor = persistStore(store);

// Export types for use throughout the app
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Re-export everything from store structure following our rules
export * from './types';
export * from './slices';
export * from './selectors';
