# Redux State Management for PKC

## Overview

This document outlines state management in PKC and how traditional Redux usage relates to the project’s PocketFlow event bus and PCard’s token-conservation model.

We introduce a bridge pattern — the Flux-to-Flow Bridge (short: "flux2flow") — that maps familiar Redux/Flux concepts onto PocketFlow’s minimal pub/sub and Petri-style token flows.

References in code:
- `src/pocketflow/bus.ts` provides a small pub/sub bus (`pocketflow.publish/subscribe`).
- `src/pocketflow/events.ts` declares canonical event topics like `PF_RUNTIME_ENV_LOADED`, `PF_MCARD_SELECTED`.

Why this matters now:
- PCard.md reframes control as token flows (Petri Nets) with conservation invariants. Redux-style actions fit naturally as “transition firings” on the PocketFlow bus.
- The bridge preserves developer ergonomics (actions, reducers, selectors) while encouraging event-first, token-conservation-aligned flows for UI panels and MCard-driven state.

---

## Flux-to-Flow Bridge (flux2flow)

Goal: keep Redux where it adds value (auth flows, derived selectors, persistence) while shifting interaction to PocketFlow events as the primary control-plane. The bridge offers naming, conventions, and a migration path.

Suggested name: "Flux-to-Flow Bridge" (package alias: `flux2flow`).

Key ideas
- __Actions → Events__: Redux actions correspond to PocketFlow topics; dispatch becomes `pocketflow.publish(topic, payload)`.
- __Reducers → Stores__: Instead of a single global reducer tree, maintain small focused stores fed by PocketFlow subscriptions. Redux slices can subscribe to PocketFlow.
- __Selectors → Views__: Keep memoized selectors but source from stores populated by PocketFlow tokens.
- __Middleware → Listeners__: Side-effects move to PocketFlow listeners (subscribe/effect), aligned with transition firings.
- __State → Markings__: Think of state as token markings in places (e.g., `sidebar`, `content`, `right` panels in `src/layouts/AppShell.astro`).

Canonical topics (see `src/pocketflow/events.ts`)
- `pocketflow/runtime/envLoaded` with `RuntimeEnvPayload`
- `pocketflow/mcard/selected` with `MCardSelectedPayload`
- `pocketflow/mcard/selectionChanged`

Mapping (Redux → PocketFlow/PCard)
- __Action type__ → event topic string (e.g., `auth/loginFulfilled` → `pocketflow/auth/loggedIn`).
- __Action payload__ → event payload (hashes, minimal descriptors).
- __Reducer update__ → listener that writes to a local store (Redux slice or lightweight store) representing place markings.
- __Thunk/epic__ → listener/effect that may emit further events (transition chaining) while preserving conservation constraints.
- __Store state__ → token counts/records keyed by MCard hashes (hash-first storage per MCard rules).

Design rules
- __Hash-first__: payloads carry MCard hashes; resolve content via MCard service on demand.
- __Small, panel-scoped stores__: align stores with UI places/panels; avoid monolith global state except for auth.
- __Event-first contracts__: new features define PocketFlow topics before reducers.
- __Conservation checks__: listeners should be idempotent and conservative (no untracked loss/duplication of tokens).

---

## Implementation plan (incremental)

Phase 1 — Bridge foundation
- __Create a tiny bridge utility (`flux2flow`)__ wrapping `pocketflow` with helpers:
  - `dispatch(topic, payload)` → calls `pocketflow.publish`.
  - `listen(topic, handler)` → calls `pocketflow.subscribe` and returns `unsubscribe`.
  - Optional: namespace helpers `topic('auth','loggedIn') => 'pocketflow/auth/loggedIn'`.
- __Define a minimal event catalog__ in `src/pocketflow/events.ts` (keep the existing constants, add auth/ui/data topics as needed).

Phase 2 — Redux slices subscribe to PocketFlow
- __Auth slice__: besides async thunks, subscribe to `pocketflow/auth/loggedIn`, `pocketflow/auth/loggedOut` to hydrate/reset.
- __UI slice__: subscribe to selection events (`pocketflow/mcard/selected`) to drive panel content.
- __Data slice__: subscribe to `pocketflow/mcard/selectionChanged` to lazy-load MCard content via API.

Phase 3 — Prefer events over dispatch
- Replace internal `store.dispatch` usages in components with `dispatch(topic, payload)` where appropriate. Keep Redux where memoized selectors and persistence help.
- Move side-effects from middleware to event listeners where it simplifies flow.

Phase 4 — Token-conservation alignment
- Ensure event flows are reversible/checkable: log token ingress/egress by hash; assert invariants in dev.
- Adopt “place” scoping: e.g., `pocketflow/ui/sidebar/selectedHash` vs `.../content/selectedHash` to keep flows explicit per panel.

Phase 5 — Documentation and patterns
- Document event contracts next to features (topic, payload schema, invariants).
- Provide examples for MCard-driven navigation and Auth session lifecycle.

Deliverables checklist
- Bridge helpers in `src/pocketflow/flux2flow.ts` (thin wrappers around `pocketflow`).
- Extended `events.ts` with namespaced topics for auth/ui/data.
- Subscriptions registered on app startup (e.g., in a bootstrap file or root layout island).
- Updated component examples using event-first patterns.

---

## Why keep Redux at all?

Redux still adds value for:
- __Authentication__: structured async, persistence, and selectors (see below). 
- __Derived state__: complex memoization across panels.
- __Debugging__: devtools and time-travel for local stores.

Use the bridge to avoid centralizing all state in Redux and to align with PCard’s Petri-style execution.

## Why Redux for PKC?

Redux provides predictable state management that's particularly beneficial for:
- **Authentication State**: Managing user sessions, tokens, and permissions across the app
- **Complex UI State**: Handling modals, notifications, and multi-step flows
- **Data Caching**: Caching MCard API responses and user data
- **Cross-Component Communication**: Sharing state between disconnected components
- **Time Travel Debugging**: Enhanced debugging capabilities during development

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       Redux Store                           │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Auth Slice    │   UI Slice      │   Data Slice            │
│                 │                 │                         │
│ - user          │ - modals        │ - mcard cache           │
│ - tokens        │ - notifications │ - search results        │
│ - permissions   │ - loading       │ - user preferences      │
│ - isAuth        │ - errors        │ - app settings          │
└─────────────────┴─────────────────┴─────────────────────────┘
```

## Store Structure

```typescript
interface RootState {
  auth: AuthState;
  ui: UIState;
  data: DataState;
}

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  permissions: string[];
  lastActivity: number;
  sessionExpiry: number;
}

interface UIState {
  modals: {
    login: boolean;
    profile: boolean;
    settings: boolean;
  };
  notifications: Notification[];
  theme: 'light' | 'dark';
  sidebar: {
    isOpen: boolean;
    activeSection: string;
  };
}

interface DataState {
  mcards: {
    items: MCard[];
    pagination: PaginationState;
    cache: Record<string, MCard>;
  };
  search: {
    query: string;
    results: SearchResult[];
    filters: SearchFilters;
  };
}
```

## User Authentication Slice

### State Interface

```typescript
interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  roles: string[];
  groups: string[];
  avatar?: string;
  preferences: UserPreferences;
  createdAt: string;
  lastLogin: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresAt: number;
  tokenType: 'Bearer';
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private';
    dataSharing: boolean;
  };
}

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  permissions: string[];
  lastActivity: number;
  sessionExpiry: number;
  loginAttempts: number;
  lockoutUntil: number | null;
}
```

### Authentication Slice Implementation

```typescript
// src/store/slices/auth-slice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authService } from '@/services/auth-service';
import type { User, AuthTokens, AuthState } from '@/types/auth';

// Initial state
const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  permissions: [],
  lastActivity: Date.now(),
  sessionExpiry: 0,
  loginAttempts: 0,
  lockoutUntil: null,
};

// Async thunks for authentication actions
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

export const loginWithAuthentik = createAsyncThunk(
  'auth/loginWithAuthentik',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.loginWithAuthentik();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Authentik login failed');
    }
  }
);

export const handleAuthCallback = createAsyncThunk(
  'auth/handleAuthCallback',
  async (callbackUrl: string, { rejectWithValue }) => {
    try {
      const response = await authService.handleCallback(callbackUrl);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Authentication callback failed');
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const refreshToken = state.auth.tokens?.refreshToken;
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await authService.refreshToken(refreshToken);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Token refresh failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { getState }) => {
    const state = getState() as { auth: AuthState };
    const tokens = state.auth.tokens;
    
    if (tokens) {
      await authService.logout(tokens.accessToken);
    }
    
    return null;
  }
);

export const fetchUserProfile = createAsyncThunk(
  'auth/fetchUserProfile',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const accessToken = state.auth.tokens?.accessToken;
      
      if (!accessToken) {
        throw new Error('No access token available');
      }
      
      const user = await authService.getUserProfile(accessToken);
      return user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch user profile');
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async (updates: Partial<User>, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const accessToken = state.auth.tokens?.accessToken;
      
      if (!accessToken) {
        throw new Error('No access token available');
      }
      
      const updatedUser = await authService.updateUserProfile(accessToken, updates);
      return updatedUser;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update user profile');
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Synchronous actions
    clearError: (state) => {
      state.error = null;
    },
    
    updateLastActivity: (state) => {
      state.lastActivity = Date.now();
    },
    
    setPermissions: (state, action: PayloadAction<string[]>) => {
      state.permissions = action.payload;
    },
    
    incrementLoginAttempts: (state) => {
      state.loginAttempts += 1;
      
      // Lock account after 5 failed attempts
      if (state.loginAttempts >= 5) {
        state.lockoutUntil = Date.now() + (15 * 60 * 1000); // 15 minutes
      }
    },
    
    resetLoginAttempts: (state) => {
      state.loginAttempts = 0;
      state.lockoutUntil = null;
    },
    
    setSessionExpiry: (state, action: PayloadAction<number>) => {
      state.sessionExpiry = action.payload;
    },
    
    // Hydrate state from localStorage on app startup
    hydrateAuth: (state, action: PayloadAction<Partial<AuthState>>) => {
      const { user, tokens, isAuthenticated, permissions, sessionExpiry } = action.payload;
      
      // Only hydrate if session hasn't expired
      if (sessionExpiry && sessionExpiry > Date.now()) {
        state.user = user || null;
        state.tokens = tokens || null;
        state.isAuthenticated = isAuthenticated || false;
        state.permissions = permissions || [];
        state.sessionExpiry = sessionExpiry || 0;
      }
    },
    
    // Clear all auth state
    resetAuth: () => initialState,
  },
  
  extraReducers: (builder) => {
    // Login user
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        state.isAuthenticated = true;
        state.permissions = action.payload.permissions || [];
        state.sessionExpiry = action.payload.tokens.expiresAt;
        state.loginAttempts = 0;
        state.lockoutUntil = null;
        state.lastActivity = Date.now();
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Authentik login
    builder
      .addCase(loginWithAuthentik.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithAuthentik.fulfilled, (state, action) => {
        state.isLoading = false;
        // Authentik login initiates redirect, actual auth happens in callback
      })
      .addCase(loginWithAuthentik.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Handle auth callback
    builder
      .addCase(handleAuthCallback.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(handleAuthCallback.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        state.isAuthenticated = true;
        state.permissions = action.payload.permissions || [];
        state.sessionExpiry = action.payload.tokens.expiresAt;
        state.lastActivity = Date.now();
      })
      .addCase(handleAuthCallback.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Refresh token
    builder
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.tokens = action.payload.tokens;
        state.sessionExpiry = action.payload.tokens.expiresAt;
        state.lastActivity = Date.now();
      })
      .addCase(refreshToken.rejected, (state) => {
        // Token refresh failed, logout user
        state.user = null;
        state.tokens = null;
        state.isAuthenticated = false;
        state.permissions = [];
        state.sessionExpiry = 0;
      });

    // Logout user
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
      state.permissions = [];
      state.sessionExpiry = 0;
      state.error = null;
    });

    // Fetch user profile
    builder
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Update user profile
    builder
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  updateLastActivity,
  setPermissions,
  incrementLoginAttempts,
  resetLoginAttempts,
  setSessionExpiry,
  hydrateAuth,
  resetAuth,
} = authSlice.actions;

export default authSlice.reducer;
```

### Selectors

```typescript
// src/store/selectors/auth-selectors.ts
import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store';

// Basic selectors
export const selectAuth = (state: RootState) => state.auth;
export const selectUser = (state: RootState) => state.auth.user;
export const selectTokens = (state: RootState) => state.auth.tokens;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectIsLoading = (state: RootState) => state.auth.isLoading;
export const selectError = (state: RootState) => state.auth.error;
export const selectPermissions = (state: RootState) => state.auth.permissions;

// Memoized selectors
export const selectUserDisplayName = createSelector(
  [selectUser],
  (user) => {
    if (!user) return null;
    return user.firstName && user.lastName 
      ? `${user.firstName} ${user.lastName}`
      : user.username || user.email;
  }
);

export const selectUserRoles = createSelector(
  [selectUser],
  (user) => user?.roles || []
);

export const selectUserGroups = createSelector(
  [selectUser],
  (user) => user?.groups || []
);

export const selectIsAdmin = createSelector(
  [selectPermissions],
  (permissions) => permissions.includes('admin') || permissions.includes('pkc_admin')
);

export const selectCanWrite = createSelector(
  [selectPermissions],
  (permissions) => permissions.includes('write') || permissions.includes('admin')
);

export const selectCanRead = createSelector(
  [selectPermissions],
  (permissions) => permissions.includes('read') || permissions.includes('write') || permissions.includes('admin')
);

export const selectIsTokenExpired = createSelector(
  [selectAuth],
  (auth) => {
    if (!auth.tokens || !auth.sessionExpiry) return true;
    return Date.now() >= auth.sessionExpiry;
  }
);

export const selectIsAccountLocked = createSelector(
  [selectAuth],
  (auth) => {
    if (!auth.lockoutUntil) return false;
    return Date.now() < auth.lockoutUntil;
  }
);

export const selectSessionTimeRemaining = createSelector(
  [selectAuth],
  (auth) => {
    if (!auth.sessionExpiry) return 0;
    const remaining = auth.sessionExpiry - Date.now();
    return Math.max(0, remaining);
  }
);
```

## Store Configuration

```typescript
// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

import authReducer from './slices/auth-slice';
import uiReducer from './slices/ui-slice';
import dataReducer from './slices/data-slice';

// Persist configuration
const persistConfig = {
  key: 'pkc-root',
  storage,
  whitelist: ['auth'], // Only persist auth state
  transforms: [
    // Custom transform to exclude sensitive data from persistence
    {
      in: (inboundState: any) => {
        if (inboundState.tokens) {
          // Don't persist actual tokens for security
          return {
            ...inboundState,
            tokens: null,
          };
        }
        return inboundState;
      },
      out: (outboundState: any) => outboundState,
    },
  ],
};

const rootReducer = combineReducers({
  auth: authReducer,
  ui: uiReducer,
  data: dataReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

## Authentication Service

```typescript
// src/services/auth-service.ts
import { OIDCClient } from 'oidc-client-ts';
import type { User, AuthTokens } from '@/types/auth';

class AuthService {
  private oidcClient: OIDCClient;

  constructor() {
    this.oidcClient = new OIDCClient({
      authority: import.meta.env.AUTHENTIK_URL,
      client_id: import.meta.env.AUTHENTIK_CLIENT_ID,
      redirect_uri: `${window.location.origin}/auth/callback`,
      response_type: 'code',
      scope: 'openid profile email',
      post_logout_redirect_uri: window.location.origin,
    });
  }

  async loginWithAuthentik() {
    const request = await this.oidcClient.createSigninRequest();
    window.location.href = request.url;
  }

  async handleCallback(url: string) {
    const response = await this.oidcClient.processSigninResponse(url);
    
    const tokens: AuthTokens = {
      accessToken: response.access_token,
      refreshToken: response.refresh_token || '',
      idToken: response.id_token || '',
      expiresAt: response.expires_at ? response.expires_at * 1000 : Date.now() + 3600000,
      tokenType: 'Bearer',
    };

    const user: User = {
      id: response.profile.sub || '',
      email: response.profile.email || '',
      username: response.profile.preferred_username || '',
      firstName: response.profile.given_name || '',
      lastName: response.profile.family_name || '',
      roles: response.profile.groups || [],
      groups: response.profile.groups || [],
      preferences: {
        theme: 'system',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          inApp: true,
        },
        privacy: {
          profileVisibility: 'private',
          dataSharing: false,
        },
      },
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    const permissions = this.extractPermissions(response.profile);

    return { user, tokens, permissions };
  }

  async refreshToken(refreshToken: string): Promise<{ tokens: AuthTokens }> {
    // Implementation depends on Authentik's token refresh endpoint
    const response = await fetch(`${import.meta.env.AUTHENTIK_URL}/application/o/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: import.meta.env.AUTHENTIK_CLIENT_ID,
        client_secret: import.meta.env.AUTHENTIK_CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    
    const tokens: AuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      idToken: data.id_token || '',
      expiresAt: Date.now() + (data.expires_in * 1000),
      tokenType: 'Bearer',
    };

    return { tokens };
  }

  async logout(accessToken: string) {
    await this.oidcClient.createSignoutRequest();
    
    // Clear any local storage
    localStorage.removeItem('persist:pkc-root');
    sessionStorage.clear();
  }

  async getUserProfile(accessToken: string): Promise<User> {
    const response = await fetch(`${import.meta.env.AUTHENTIK_URL}/application/o/userinfo/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const profile = await response.json();
    
    return {
      id: profile.sub,
      email: profile.email,
      username: profile.preferred_username,
      firstName: profile.given_name,
      lastName: profile.family_name,
      roles: profile.groups || [],
      groups: profile.groups || [],
      preferences: {
        theme: 'system',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          inApp: true,
        },
        privacy: {
          profileVisibility: 'private',
          dataSharing: false,
        },
      },
      createdAt: profile.created_at || new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
  }

  async updateUserProfile(accessToken: string, updates: Partial<User>): Promise<User> {
    // This would depend on Authentik's user update endpoint
    // For now, return the updated user (this would typically make an API call)
    throw new Error('User profile updates not implemented yet');
  }

  private extractPermissions(profile: any): string[] {
    const groups = profile.groups || [];
    const permissions: string[] = [];

    // Map groups to permissions
    if (groups.includes('pkc_admin')) {
      permissions.push('admin', 'write', 'read');
    } else if (groups.includes('pkc_user')) {
      permissions.push('write', 'read');
    } else if (groups.includes('pkc_viewer')) {
      permissions.push('read');
    }

    return permissions;
  }
}

export const authService = new AuthService();
```

## Usage Examples

### Using in React Components

```typescript
// src/components/auth/login-button.tsx
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginWithAuthentik } from '@/store/slices/auth-slice';
import { selectIsLoading, selectError } from '@/store/selectors/auth-selectors';
import { Button } from '@/components/ui/button';

export function LoginButton() {
  const dispatch = useDispatch();
  const isLoading = useSelector(selectIsLoading);
  const error = useSelector(selectError);

  const handleLogin = () => {
    dispatch(loginWithAuthentik());
  };

  return (
    <div>
      <Button onClick={handleLogin} disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login with Authentik'}
      </Button>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}
```

### Protected Route Component

```typescript
// src/components/auth/protected-route.tsx
import React from 'react';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectIsLoading } from '@/store/selectors/auth-selectors';
import { LoginPrompt } from './login-prompt';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
}

export function ProtectedRoute({ children, requiredPermissions = [] }: ProtectedRouteProps) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectIsLoading);
  const permissions = useSelector(selectPermissions);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <LoginPrompt />;
  }

  if (requiredPermissions.length > 0) {
    const hasPermission = requiredPermissions.some(permission => 
      permissions.includes(permission)
    );

    if (!hasPermission) {
      return <div>Access denied. Insufficient permissions.</div>;
    }
  }

  return <>{children}</>;
}
```

## Middleware & Session Management

```typescript
// src/store/middleware/auth-middleware.ts
import { createListenerMiddleware } from '@reduxjs/toolkit';
import { refreshToken, logoutUser, updateLastActivity } from '@/store/slices/auth-slice';

export const authMiddleware = createListenerMiddleware();

// Auto-refresh tokens before expiry
authMiddleware.startListening({
  predicate: (action, currentState, previousState) => {
    const current = currentState.auth;
    const previous = previousState.auth;
    
    // Check if we need to refresh token (5 minutes before expiry)
    if (current.isAuthenticated && current.sessionExpiry) {
      const timeUntilExpiry = current.sessionExpiry - Date.now();
      return timeUntilExpiry <= 300000 && timeUntilExpiry > 0; // 5 minutes
    }
    
    return false;
  },
  effect: async (action, listenerApi) => {
    listenerApi.dispatch(refreshToken());
  },
});

// Update last activity on any action
authMiddleware.startListening({
  predicate: (action) => {
    // Update activity for any user action (except auth actions)
    return !action.type.startsWith('auth/');
  },
  effect: (action, listenerApi) => {
    const state = listenerApi.getState();
    if (state.auth.isAuthenticated) {
      listenerApi.dispatch(updateLastActivity());
    }
  },
});

// Auto-logout on token expiry
authMiddleware.startListening({
  predicate: (action, currentState) => {
    const auth = currentState.auth;
    return auth.isAuthenticated && auth.sessionExpiry && Date.now() >= auth.sessionExpiry;
  },
  effect: (action, listenerApi) => {
    listenerApi.dispatch(logoutUser());
  },
});
```

## Best Practices

### 1. Security Best Practices
- Never store sensitive tokens in Redux state that persists
- Implement proper token rotation
- Use secure HTTP-only cookies for token storage when possible
- Validate permissions on both client and server side

### 2. Performance Optimization
- Use memoized selectors to prevent unnecessary re-renders
- Implement proper loading states
- Cache user data appropriately
- Debounce frequent updates

### 3. Error Handling
- Implement comprehensive error boundaries
- Provide user-friendly error messages
- Log authentication errors for debugging
- Handle network failures gracefully

### 4. Testing
- Mock authentication state in tests
- Test all authentication flows
- Verify permission-based access control
- Test token refresh scenarios

## Integration with Astro

```typescript
// src/stores/redux-provider.astro
---
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/store';
---

<Provider client:load store={store}>
  <PersistGate loading={<div>Loading...</div>} persistor={persistor}>
    <slot />
  </PersistGate>
</Provider>
```

---

**Last Updated**: 2025-07-30
**Version**: 1.0
**Status**: Ready for Implementation
