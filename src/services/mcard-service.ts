import type { MCard, SearchResult, SearchFilters, PaginationState } from '../store/types/data';
import { indexedDBService } from './indexeddb-service';

interface MCardListResponse {
  items: MCard[];
  pagination: PaginationState;
}

interface SearchResponse {
  results: SearchResult[];
  pagination: PaginationState;
}

export class MCardService {
  private _baseUrl: string;
  private offlineMode: boolean = false;

  constructor() {
    // Initialize with fallback, but will be updated when runtime env loads
    this._baseUrl = this.getApiUrl();
    
    // Debug: Log the configured URL and source
    console.log('🔧 MCardService initialized with baseUrl:', this._baseUrl);
    console.log('🔧 Environment source:', this.getUrlSource());
    
    // Listen for runtime environment updates
    this.setupRuntimeEnvListener();
    
    // Monitor online/offline status
    this.setupOfflineDetection();
  }

  // Dynamic API URL getter that always checks current runtime environment
  private getApiUrl(): string {
    const url = window.RUNTIME_ENV?.PUBLIC_MCARD_API_URL || 
                (typeof import.meta !== 'undefined' ? import.meta.env?.PUBLIC_MCARD_API_URL : undefined) ||
                'http://localhost:49384/v1';
    
    // Remove trailing slash to avoid double slashes in API calls
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  // Get current URL source for debugging
  private getUrlSource(): string {
    if (window.RUNTIME_ENV?.PUBLIC_MCARD_API_URL) return 'window.RUNTIME_ENV';
    if (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_MCARD_API_URL) return 'import.meta.env';
    return 'fallback';
  }

  // Setup listener for runtime environment changes
  private setupRuntimeEnvListener(): void {
    if (typeof window !== 'undefined') {
      // Listen for custom event when runtime env is loaded
      window.addEventListener('runtime-env-loaded', () => {
        const newUrl = this.getApiUrl();
        if (newUrl !== this._baseUrl) {
          console.log('🔄 Runtime environment updated, changing API URL from', this._baseUrl, 'to', newUrl);
          this._baseUrl = newUrl;
        }
      });
      
      // Also periodically check if runtime env has been loaded
      const checkRuntimeEnv = () => {
        const newUrl = this.getApiUrl();
        if (newUrl !== this._baseUrl && newUrl !== 'http://localhost:49384/v1') {
          console.log('🔄 Runtime environment detected, updating API URL from', this._baseUrl, 'to', newUrl);
          this._baseUrl = newUrl;
        }
      };
      
      // Check every second for first 10 seconds, then every 5 seconds for 30 seconds
      let checks = 0;
      const interval = setInterval(() => {
        checkRuntimeEnv();
        checks++;
        if (checks >= 10) {
          clearInterval(interval);
          // Less frequent checks for late-loading env
          const slowInterval = setInterval(() => {
            checkRuntimeEnv();
            checks++;
            if (checks >= 16) clearInterval(slowInterval); // Total 40 seconds
          }, 5000);
        }
      }, 1000);
    }
  }

  // Getter for current base URL (always fresh)
  private get baseUrl(): string {
    // Always return fresh URL to handle runtime env changes
    const currentUrl = this.getApiUrl();
    if (currentUrl !== this._baseUrl) {
      this._baseUrl = currentUrl;
    }
    return this._baseUrl;
  }

  private setupOfflineDetection(): void {
    if (typeof window !== 'undefined') {
      this.offlineMode = !navigator.onLine;
      
      window.addEventListener('online', () => {
        this.offlineMode = false;
        console.log('🌐 Back online - API requests enabled');
      });
      
      window.addEventListener('offline', () => {
        this.offlineMode = true;
        console.log('📴 Offline mode - using cached data only');
      });
    }
  }

  /**
   * Fetch MCards with pagination and sorting
   */
  async fetchMCards(params: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: string;
  } = {}): Promise<MCardListResponse> {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'g_time',
      sortOrder = 'desc'
    } = params;

    const searchParams = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    const response = await fetch(`${this.baseUrl}/cards?${searchParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch MCards: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      items: data.items.map(this.mapMCardResponse),
      pagination: {
        page: data.page,
        pageSize: data.page_size,
        totalItems: data.total_items,
        totalPages: Math.ceil(data.total_items / data.page_size),
        hasNextPage: data.page < Math.ceil(data.total_items / data.page_size),
        hasPreviousPage: data.page > 1,
      },
    };
  }

  /**
   * Get MCard content by hash with offline caching
   */
  async getMCardContent(hash: string, asText: boolean = false): Promise<string | Blob> {
    // Check cache first
    const cached = await indexedDBService.getCachedMCard(hash);
    if (cached) {
      console.log(`📋 Using cached content for: ${hash}`);
      return cached.content;
    }

    // If offline and not cached, throw error
    if (this.offlineMode) {
      throw new Error(`Content not available offline: ${hash}`);
    }

    // Fetch from API
    const url = `${this.baseUrl}/card/${hash}/content${asText ? '?as_text=true' : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch MCard content: ${response.statusText}`);
    }

    const content = asText ? await response.text() : await response.blob();
    
    // Cache the content for offline use
    try {
      const metadata = await this.getMCardMetadata(hash);
      await indexedDBService.cacheMCard(hash, content, metadata);
      
      // Index text content for search
      if (asText && typeof content === 'string') {
        const title = metadata.filename || `Document ${hash.substring(0, 8)}`;
        await indexedDBService.indexContent(hash, content, title, metadata.contentType);
      }
    } catch (error) {
      console.warn('⚠️ Failed to cache content:', error);
    }

    return content;
  }

  /**
   * Get MCard metadata by hash
   */
  async getMCardMetadata(hash: string): Promise<MCard> {
    const response = await fetch(`${this.baseUrl}/card/${hash}/metadata`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch MCard metadata: ${response.statusText}`);
    }

    const data = await response.json();
    return this.mapMCardResponse(data);
  }

  /**
   * Search MCards with offline fallback
   */
  async searchMCards(params: {
    query: string;
    filters?: SearchFilters;
    page?: number;
    pageSize?: number;
  }): Promise<SearchResponse> {
    const {
      query,
      filters = {},
      page = 1,
      pageSize = 20
    } = params;

    // If offline, search cached content
    if (this.offlineMode) {
      const cachedResults = await indexedDBService.searchCached(query);
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedResults = cachedResults.slice(startIndex, endIndex);
      
      return {
        results: paginatedResults.map(item => ({
          hash: item.hash,
          relevanceScore: 0.8, // Default relevance for cached search
          snippet: item.content.substring(0, 200) + '...',
          metadata: {},
        })),
        pagination: {
          page,
          pageSize,
          totalItems: cachedResults.length,
          totalPages: Math.ceil(cachedResults.length / pageSize),
          hasNextPage: endIndex < cachedResults.length,
          hasPreviousPage: page > 1,
        },
      };
    }

    // Online search
    const searchParams = new URLSearchParams({
      query,
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    const response = await fetch(`${this.baseUrl}/cards/search?${searchParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      results: data.items.map((item: any) => ({
        hash: item.hash,
        relevanceScore: item.relevance_score || 1.0,
        snippet: item.snippet || '',
        metadata: item.metadata || {},
      })),
      pagination: {
        page: data.page,
        pageSize: data.page_size,
        totalItems: data.total_items,
        totalPages: Math.ceil(data.total_items / data.page_size),
        hasNextPage: data.page < Math.ceil(data.total_items / data.page_size),
        hasPreviousPage: data.page > 1,
      },
    };
  }

  /**
   * Upload a file as MCard
   */
  async uploadFile(file: File, metadata?: Record<string, any>): Promise<MCard> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (metadata && Object.keys(metadata).length > 0) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const response = await fetch(`${this.baseUrl}/files`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Upload failed: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    return this.mapMCardResponse(data);
  }

  /**
   * Store content as MCard
   */
  async storeContent(content: string | Blob): Promise<MCard> {
    const formData = new FormData();
    formData.append('content', content);

    const response = await fetch(`${this.baseUrl}/card`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Store content failed: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    return this.mapMCardResponse(data);
  }

  /**
   * Delete MCard by hash
   */
  async deleteMCard(hash: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/card/${hash}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }
  }

  /**
   * Get MCard count
   */
  async getMCardCount(): Promise<number> {
    const response = await fetch(`${this.baseUrl}/cards/count`);
    
    if (!response.ok) {
      throw new Error(`Failed to get MCard count: ${response.statusText}`);
    }

    const data = await response.json();
    return data.count;
  }

  /**
   * Search MCards by partial hash
   */
  async searchByHash(partialHash: string, page: number = 1, pageSize: number = 10): Promise<SearchResponse> {
    const searchParams = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    const response = await fetch(
      `${this.baseUrl}/cards/search-by-hash/${partialHash}?${searchParams.toString()}`
    );
    
    if (!response.ok) {
      throw new Error(`Hash search failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      results: data.items.map((item: any) => ({
        hash: item.hash,
        relevanceScore: 1.0,
        snippet: '',
        metadata: item.metadata || {},
      })),
      pagination: {
        page: data.page,
        pageSize: data.page_size,
        totalItems: data.total_items,
        totalPages: Math.ceil(data.total_items / data.page_size),
        hasNextPage: data.page < Math.ceil(data.total_items / data.page_size),
        hasPreviousPage: data.page > 1,
      },
    };
  }

  /**
   * Map MCard API response to our MCard interface
   */
  private mapMCardResponse(data: any): MCard {
    return {
      hash: data.hash,
      contentType: data.content_type,
      size: data.size_bytes,
      timestamp: data.g_time,
      metadata: data.metadata || {},
      filename: data.filename,
    };
  }

  /**
   * Check service health
   */
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get service status and metrics
   */
  async getStatus(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/status`);
    
    if (!response.ok) {
      throw new Error(`Status check failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get offline cache statistics
   */
  async getCacheStats() {
    return await indexedDBService.getCacheStats();
  }

  /**
   * Clear offline cache
   */
  async clearCache(): Promise<void> {
    await indexedDBService.clearCache();
  }

  /**
   * Check if content is available offline
   */
  async isAvailableOffline(hash: string): Promise<boolean> {
    return await indexedDBService.isCached(hash);
  }

  /**
   * Get all cached MCards
   */
  async getCachedMCards() {
    return await indexedDBService.getAllCached();
  }

  /**
   * Force cache a specific MCard
   */
  async cacheForOffline(hash: string): Promise<void> {
    try {
      const metadata = await this.getMCardMetadata(hash);
      const content = await this.getMCardContent(hash, true); // Get as text for indexing
      await indexedDBService.cacheMCard(hash, content, metadata);
      
      if (typeof content === 'string') {
        const title = metadata.filename || `Document ${hash.substring(0, 8)}`;
        await indexedDBService.indexContent(hash, content, title, metadata.contentType);
      }
    } catch (error) {
      console.error('❌ Failed to cache MCard for offline:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const mcardService = new MCardService();
