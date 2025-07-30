import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { UIState, Notification, ModalState, SidebarState, LoadingState } from '../types/ui';

const initialState: UIState = {
  theme: 'system',
  modals: {
    login: false,
    profile: false,
    settings: false,
    confirmation: false,
    upload: false,
  },
  notifications: [],
  sidebar: {
    isOpen: true,
    activeSection: 'home',
    collapsed: false,
  },
  loading: {
    global: false,
    auth: false,
    upload: false,
    search: false,
    navigation: false,
  },
  errors: {},
  isOnline: true,
  viewport: {
    width: 1920,
    height: 1080,
    isMobile: false,
    isTablet: false,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Theme management
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },

    // Modal management
    openModal: (state, action: PayloadAction<keyof ModalState>) => {
      state.modals[action.payload] = true;
    },

    closeModal: (state, action: PayloadAction<keyof ModalState>) => {
      state.modals[action.payload] = false;
    },

    closeAllModals: (state) => {
      Object.keys(state.modals).forEach((key) => {
        state.modals[key as keyof ModalState] = false;
      });
    },

    // Notification management
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };
      state.notifications.push(notification);
    },

    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },

    clearNotifications: (state) => {
      state.notifications = [];
    },

    // Sidebar management
    toggleSidebar: (state) => {
      state.sidebar.isOpen = !state.sidebar.isOpen;
    },

    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebar.isOpen = action.payload;
    },

    setActiveSection: (state, action: PayloadAction<string>) => {
      state.sidebar.activeSection = action.payload;
    },

    toggleSidebarCollapsed: (state) => {
      state.sidebar.collapsed = !state.sidebar.collapsed;
    },

    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebar.collapsed = action.payload;
    },

    // Loading state management
    setLoading: (state, action: PayloadAction<{ key: keyof LoadingState; value: boolean }>) => {
      const { key, value } = action.payload;
      state.loading[key] = value;
    },

    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.global = action.payload;
    },

    // Error management
    setError: (state, action: PayloadAction<{ key: string; error: string }>) => {
      const { key, error } = action.payload;
      state.errors[key] = error;
    },

    clearError: (state, action: PayloadAction<string>) => {
      delete state.errors[action.payload];
    },

    clearAllErrors: (state) => {
      state.errors = {};
    },

    // Network status
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },

    // Viewport management
    setViewportSize: (state, action: PayloadAction<{ width: number; height: number }>) => {
      const { width, height } = action.payload;
      state.viewport.width = width;
      state.viewport.height = height;
      state.viewport.isMobile = width < 768;
      state.viewport.isTablet = width >= 768 && width < 1024;
    },

    // Batch actions for performance
    batchUpdateUI: (state, action: PayloadAction<Partial<UIState>>) => {
      Object.assign(state, action.payload);
    },

    // Reset UI state
    resetUI: () => initialState,
  },
});

export const {
  setTheme,
  openModal,
  closeModal,
  closeAllModals,
  addNotification,
  removeNotification,
  clearNotifications,
  toggleSidebar,
  setSidebarOpen,
  setActiveSection,
  toggleSidebarCollapsed,
  setSidebarCollapsed,
  setLoading,
  setGlobalLoading,
  setError,
  clearError,
  clearAllErrors,
  setOnlineStatus,
  setViewportSize,
  batchUpdateUI,
  resetUI,
} = uiSlice.actions;

export default uiSlice.reducer;
