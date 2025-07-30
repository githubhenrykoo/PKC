import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../types';

// Basic selectors
export const selectAuth = (state: RootState) => state.auth;
export const selectUser = (state: RootState) => state.auth.user;
export const selectTokens = (state: RootState) => state.auth.tokens;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectIsLoading = (state: RootState) => state.auth.isLoading;
export const selectError = (state: RootState) => state.auth.error;
export const selectPermissions = (state: RootState) => state.auth.permissions;
export const selectLastActivity = (state: RootState) => state.auth.lastActivity;
export const selectSessionExpiry = (state: RootState) => state.auth.sessionExpiry;
export const selectLoginAttempts = (state: RootState) => state.auth.loginAttempts;
export const selectLockoutUntil = (state: RootState) => state.auth.lockoutUntil;

// Memoized selectors for computed values
export const selectUserDisplayName = createSelector(
  [selectUser],
  (user) => {
    if (!user) return null;
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username || user.email;
  }
);

export const selectUserInitials = createSelector(
  [selectUser],
  (user) => {
    if (!user) return null;
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return user.email.charAt(0).toUpperCase();
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

// Permission-based selectors
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

export const selectHasPermission = createSelector(
  [selectPermissions, (_, permission: string) => permission],
  (permissions, permission) => permissions.includes(permission)
);

// Session and security selectors
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

export const selectSessionTimeRemainingMinutes = createSelector(
  [selectSessionTimeRemaining],
  (timeRemaining) => Math.floor(timeRemaining / (1000 * 60))
);

export const selectIsSessionExpiringSoon = createSelector(
  [selectSessionTimeRemaining],
  (timeRemaining) => timeRemaining > 0 && timeRemaining <= 300000 // 5 minutes
);

export const selectTimeSinceLastActivity = createSelector(
  [selectLastActivity],
  (lastActivity) => Date.now() - lastActivity
);

export const selectIsUserIdle = createSelector(
  [selectTimeSinceLastActivity],
  (timeSinceActivity) => timeSinceActivity > 1800000 // 30 minutes
);

// User preferences selectors
export const selectUserPreferences = createSelector(
  [selectUser],
  (user) => user?.preferences || null
);

export const selectUserTheme = createSelector(
  [selectUserPreferences],
  (preferences) => preferences?.theme || 'system'
);

export const selectUserLanguage = createSelector(
  [selectUserPreferences],
  (preferences) => preferences?.language || 'en'
);

export const selectUserNotificationSettings = createSelector(
  [selectUserPreferences],
  (preferences) => preferences?.notifications || {
    email: true,
    push: true,
    inApp: true,
  }
);

export const selectUserPrivacySettings = createSelector(
  [selectUserPreferences],
  (preferences) => preferences?.privacy || {
    profileVisibility: 'private',
    dataSharing: false,
  }
);

// Auth state validation selectors
export const selectIsAuthStateValid = createSelector(
  [selectAuth],
  (auth) => {
    if (!auth.isAuthenticated) return true; // No validation needed if not authenticated
    
    return !!(
      auth.user &&
      auth.tokens &&
      auth.sessionExpiry > Date.now() &&
      !auth.lockoutUntil
    );
  }
);

export const selectAuthStateInfo = createSelector(
  [selectAuth],
  (auth) => ({
    isAuthenticated: auth.isAuthenticated,
    hasUser: !!auth.user,
    hasTokens: !!auth.tokens,
    isExpired: auth.sessionExpiry ? Date.now() >= auth.sessionExpiry : true,
    isLocked: auth.lockoutUntil ? Date.now() < auth.lockoutUntil : false,
    loginAttempts: auth.loginAttempts,
    isLoading: auth.isLoading,
    hasError: !!auth.error,
  })
);
