import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { 
  AuthState, 
  User, 
  AuthTokens, 
  LoginCredentials, 
  AuthResponse, 
  TokenRefreshResponse 
} from '../types/auth';

// Initial state following Redux rules
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
export const loginWithAuthentik = createAsyncThunk(
  'auth/loginWithAuthentik',
  async (_, { rejectWithValue }) => {
    try {
      // Import dynamically to avoid SSR issues
      const { authService } = await import('@/services/auth-service');
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
      const { authService } = await import('@/services/auth-service');
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
      
      const { authService } = await import('@/services/auth-service');
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
      const { authService } = await import('@/services/auth-service');
      await authService.logout(tokens.accessToken);
    }
    
    // Clear persisted state
    if (typeof window !== 'undefined') {
      localStorage.removeItem('persist:pkc-root');
      sessionStorage.clear();
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
      
      const { authService } = await import('@/services/auth-service');
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
      
      const { authService } = await import('@/services/auth-service');
      const updatedUser = await authService.updateUserProfile(accessToken, updates);
      return updatedUser;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update user profile');
    }
  }
);

// Authentication slice
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
        state.lastActivity = Date.now();
      }
    },
    
    // Clear all auth state
    resetAuth: () => initialState,
  },
  
  extraReducers: (builder) => {
    // Authentik login
    builder
      .addCase(loginWithAuthentik.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithAuthentik.fulfilled, (state) => {
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
        const { user, tokens, permissions } = action.payload as AuthResponse;
        state.isLoading = false;
        state.user = user;
        state.tokens = tokens;
        state.isAuthenticated = true;
        state.permissions = permissions || [];
        state.sessionExpiry = tokens.expiresAt;
        state.loginAttempts = 0;
        state.lockoutUntil = null;
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
        const { tokens } = action.payload as TokenRefreshResponse;
        state.tokens = tokens;
        state.sessionExpiry = tokens.expiresAt;
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
      state.lastActivity = Date.now();
    });

    // Fetch user profile
    builder
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.user = action.payload as User;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Update user profile
    builder
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.user = action.payload as User;
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
