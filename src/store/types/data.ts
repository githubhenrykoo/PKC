// Data State Types for Redux Store
export interface MCard {
  hash: string;
  contentType: string;
  size?: number;
  timestamp: string;
  metadata?: Record<string, any>;
  content?: string | Blob;
  filename?: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SearchFilters {
  contentType?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  tags?: string[];
  size?: {
    min: number;
    max: number;
  };
}

export interface SearchResult {
  hash: string;
  relevanceScore: number;
  snippet: string;
  metadata: Record<string, any>;
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  filters: SearchFilters;
  isLoading: boolean;
  error: string | null;
  lastSearchTime: number;
}

export interface MCardCache {
  [hash: string]: {
    data: MCard;
    lastAccessed: number;
    expiry: number;
  };
}

export interface DataState {
  mcards: {
    items: MCard[];
    pagination: PaginationState;
    cache: MCardCache;
    isLoading: boolean;
    error: string | null;
  };
  search: SearchState;
  uploads: {
    queue: Array<{
      id: string;
      file: File;
      progress: number;
      status: 'pending' | 'uploading' | 'completed' | 'failed';
      error?: string;
    }>;
    isUploading: boolean;
  };
  preferences: {
    viewMode: 'grid' | 'list';
    sortBy: 'date' | 'name' | 'size' | 'type';
    sortOrder: 'asc' | 'desc';
    itemsPerPage: number;
  };
}
