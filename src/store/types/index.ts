// Re-export all Redux types
export type * from './auth';
export type * from './ui';
export type * from './data';

// Root State interface
import type { AuthState } from './auth';
import type { UIState } from './ui';
import type { DataState } from './data';

export interface RootState {
  auth: AuthState;
  ui: UIState;
  data: DataState;
}

// App Dispatch type will be defined in store/index.ts
export type AppDispatch = any; // This will be properly typed in store/index.ts
