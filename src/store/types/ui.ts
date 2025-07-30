// UI State Types for Redux Store
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
}

export interface ModalState {
  login: boolean;
  profile: boolean;
  settings: boolean;
  confirmation: boolean;
  upload: boolean;
}

export interface SidebarState {
  isOpen: boolean;
  activeSection: string;
  collapsed: boolean;
}

export interface LoadingState {
  global: boolean;
  auth: boolean;
  upload: boolean;
  search: boolean;
  navigation: boolean;
}

export interface UIState {
  theme: 'light' | 'dark' | 'system';
  modals: ModalState;
  notifications: Notification[];
  sidebar: SidebarState;
  loading: LoadingState;
  errors: Record<string, string>;
  isOnline: boolean;
  viewport: {
    width: number;
    height: number;
    isMobile: boolean;
    isTablet: boolean;
  };
}
