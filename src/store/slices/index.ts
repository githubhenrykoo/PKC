// Re-export all Redux slices
export { default as authReducer } from './auth-slice';
export { default as uiReducer } from './ui-slice';
export { default as dataReducer } from './data-slice';

// Re-export auth actions explicitly to avoid conflicts
export {
  loginWithAuthentik,
  handleAuthCallback,
  refreshToken,
  logoutUser,
  fetchUserProfile,
  updateUserProfile,
  clearError as clearAuthError,
  updateLastActivity,
  setPermissions,
  incrementLoginAttempts,
  resetLoginAttempts,
  setSessionExpiry,
  hydrateAuth,
  resetAuth,
} from './auth-slice';

// Re-export UI slice actions
export * from './ui-slice';

// Re-export data slice actions  
export * from './data-slice';

// Export clearError from auth as the default clearError for backward compatibility
export { clearError } from './auth-slice';
