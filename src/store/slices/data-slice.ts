import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { 
  DataState, 
  MCard, 
  SearchFilters, 
  SearchResult, 
  PaginationState 
} from '../types/data';

const initialState: DataState = {
  mcards: {
    items: [],
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    cache: {},
    isLoading: false,
    error: null,
  },
  search: {
    query: '',
    results: [],
    filters: {},
    isLoading: false,
    error: null,
    lastSearchTime: 0,
  },
  uploads: {
    queue: [],
    isUploading: false,
  },
  preferences: {
    viewMode: 'grid',
    sortBy: 'date',
    sortOrder: 'desc',
    itemsPerPage: 20,
  },
};

// Async thunks for data operations
export const fetchMCards = createAsyncThunk(
  'data/fetchMCards',
  async (params: { page?: number; pageSize?: number; sortBy?: string; sortOrder?: string } = {}, { rejectWithValue }) => {
    try {
      const { mcardService } = await import('../../services/mcard-service.ts');
      const response = await mcardService.fetchMCards(params);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch MCards');
    }
  }
);

export const fetchMCardContent = createAsyncThunk(
  'data/fetchMCardContent',
  async (hash: string, { rejectWithValue }) => {
    try {
      const { mcardService } = await import('../../services/mcard-service.ts');
      const content = await mcardService.getMCardContent(hash);
      return { hash, content };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch MCard content');
    }
  }
);

export const searchMCards = createAsyncThunk(
  'data/searchMCards',
  async (params: { query: string; filters?: SearchFilters; page?: number; pageSize?: number }, { rejectWithValue }) => {
    try {
      const { mcardService } = await import('../../services/mcard-service.ts');
      const results = await mcardService.searchMCards(params);
      return { ...params, results };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Search failed');
    }
  }
);

export const uploadFile = createAsyncThunk(
  'data/uploadFile',
  async (file: File, { rejectWithValue }) => {
    try {
      const { mcardService } = await import('../../services/mcard-service.ts');
      const result = await mcardService.uploadFile(file);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Upload failed');
    }
  }
);

export const deleteMCard = createAsyncThunk(
  'data/deleteMCard',
  async (hash: string, { rejectWithValue }) => {
    try {
      const { mcardService } = await import('../../services/mcard-service.ts');
      await mcardService.deleteMCard(hash);
      return hash;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Delete failed');
    }
  }
);

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    // Search management
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.search.query = action.payload;
    },

    setSearchFilters: (state, action: PayloadAction<SearchFilters>) => {
      state.search.filters = action.payload;
    },

    clearSearchResults: (state) => {
      state.search.results = [];
      state.search.query = '';
      state.search.filters = {};
      state.search.error = null;
    },

    // Cache management
    addToCache: (state, action: PayloadAction<{ hash: string; data: MCard }>) => {
      const { hash, data } = action.payload;
      state.mcards.cache[hash] = {
        data,
        lastAccessed: Date.now(),
        expiry: Date.now() + (60 * 60 * 1000), // 1 hour
      };
    },

    removeFromCache: (state, action: PayloadAction<string>) => {
      delete state.mcards.cache[action.payload];
    },

    clearCache: (state) => {
      state.mcards.cache = {};
    },

    // Upload queue management
    addToUploadQueue: (state, action: PayloadAction<{ id: string; file: File }>) => {
      const { id, file } = action.payload;
      state.uploads.queue.push({
        id,
        file,
        progress: 0,
        status: 'pending',
      });
    },

    updateUploadProgress: (state, action: PayloadAction<{ id: string; progress: number }>) => {
      const { id, progress } = action.payload;
      const upload = state.uploads.queue.find(u => u.id === id);
      if (upload) {
        upload.progress = progress;
        upload.status = progress === 100 ? 'completed' : 'uploading';
      }
    },

    setUploadError: (state, action: PayloadAction<{ id: string; error: string }>) => {
      const { id, error } = action.payload;
      const upload = state.uploads.queue.find(u => u.id === id);
      if (upload) {
        upload.status = 'failed';
        upload.error = error;
      }
    },

    removeFromUploadQueue: (state, action: PayloadAction<string>) => {
      state.uploads.queue = state.uploads.queue.filter(u => u.id !== action.payload);
    },

    clearUploadQueue: (state) => {
      state.uploads.queue = [];
      state.uploads.isUploading = false;
    },

    // Preferences management
    setViewMode: (state, action: PayloadAction<'grid' | 'list'>) => {
      state.preferences.viewMode = action.payload;
    },

    setSortBy: (state, action: PayloadAction<'date' | 'name' | 'size' | 'type'>) => {
      state.preferences.sortBy = action.payload;
    },

    setSortOrder: (state, action: PayloadAction<'asc' | 'desc'>) => {
      state.preferences.sortOrder = action.payload;
    },

    setItemsPerPage: (state, action: PayloadAction<number>) => {
      state.preferences.itemsPerPage = action.payload;
    },

    // Pagination
    setPagination: (state, action: PayloadAction<Partial<PaginationState>>) => {
      state.mcards.pagination = { ...state.mcards.pagination, ...action.payload };
    },

    // Error management
    clearMCardError: (state) => {
      state.mcards.error = null;
    },

    clearSearchError: (state) => {
      state.search.error = null;
    },

    // Reset data state
    resetData: () => initialState,
  },

  extraReducers: (builder) => {
    // Fetch MCards
    builder
      .addCase(fetchMCards.pending, (state) => {
        state.mcards.isLoading = true;
        state.mcards.error = null;
      })
      .addCase(fetchMCards.fulfilled, (state, action) => {
        state.mcards.isLoading = false;
        state.mcards.items = action.payload.items;
        state.mcards.pagination = action.payload.pagination;
        
        // Update cache
        action.payload.items.forEach((mcard: MCard) => {
          state.mcards.cache[mcard.hash] = {
            data: mcard,
            lastAccessed: Date.now(),
            expiry: Date.now() + (60 * 60 * 1000),
          };
        });
      })
      .addCase(fetchMCards.rejected, (state, action) => {
        state.mcards.isLoading = false;
        state.mcards.error = action.payload as string;
      });

    // Fetch MCard content
    builder
      .addCase(fetchMCardContent.fulfilled, (state, action) => {
        const { hash, content } = action.payload;
        if (state.mcards.cache[hash]) {
          state.mcards.cache[hash].data.content = content;
          state.mcards.cache[hash].lastAccessed = Date.now();
        }
        
        // Update in items array if present
        const item = state.mcards.items.find(mcard => mcard.hash === hash);
        if (item) {
          item.content = content;
        }
      });

    // Search MCards
    builder
      .addCase(searchMCards.pending, (state) => {
        state.search.isLoading = true;
        state.search.error = null;
      })
      .addCase(searchMCards.fulfilled, (state, action) => {
        state.search.isLoading = false;
        state.search.results = action.payload.results.results;
        state.search.query = action.payload.query;
        state.search.filters = action.payload.filters || {};
        state.search.lastSearchTime = Date.now();
      })
      .addCase(searchMCards.rejected, (state, action) => {
        state.search.isLoading = false;
        state.search.error = action.payload as string;
      });

    // Upload file
    builder
      .addCase(uploadFile.pending, (state) => {
        state.uploads.isUploading = true;
      })
      .addCase(uploadFile.fulfilled, (state, action) => {
        state.uploads.isUploading = false;
        
        // Add new MCard to items if it doesn't exist
        const existingMCard = state.mcards.items.find(mcard => mcard.hash === action.payload.hash);
        if (!existingMCard) {
          state.mcards.items.unshift(action.payload);
          state.mcards.pagination.totalItems += 1;
        }
        
        // Update cache
        state.mcards.cache[action.payload.hash] = {
          data: action.payload,
          lastAccessed: Date.now(),
          expiry: Date.now() + (60 * 60 * 1000),
        };
      })
      .addCase(uploadFile.rejected, (state) => {
        state.uploads.isUploading = false;
      });

    // Delete MCard
    builder
      .addCase(deleteMCard.fulfilled, (state, action) => {
        const hash = action.payload;
        
        // Remove from items
        state.mcards.items = state.mcards.items.filter(mcard => mcard.hash !== hash);
        state.mcards.pagination.totalItems = Math.max(0, state.mcards.pagination.totalItems - 1);
        
        // Remove from cache
        delete state.mcards.cache[hash];
        
        // Remove from search results
        state.search.results = state.search.results.filter(result => result.hash !== hash);
      });
  },
});

export const {
  setSearchQuery,
  setSearchFilters,
  clearSearchResults,
  addToCache,
  removeFromCache,
  clearCache,
  addToUploadQueue,
  updateUploadProgress,
  setUploadError,
  removeFromUploadQueue,
  clearUploadQueue,
  setViewMode,
  setSortBy,
  setSortOrder,
  setItemsPerPage,
  setPagination,
  clearMCardError,
  clearSearchError,
  resetData,
} = dataSlice.actions;

export default dataSlice.reducer;
