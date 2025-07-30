import type { MCard, SearchResult, SearchFilters, PaginationState } from '../store/types/data';

interface MCardListResponse {
  items: MCard[];
  pagination: PaginationState;
}

interface SearchResponse {
  results: SearchResult[];
  pagination: PaginationState;
}

class MCardService {
  private baseUrl: string;

  constructor() {
    // Use MCard API base URL from environment or default to localhost
    this.baseUrl = import.meta.env.PUBLIC_MCARD_API_URL || 'http://localhost:49384/v1';
    
    // Debug: Log the configured URL
    console.log('🔧 MCARD_API_URL configured as:', this.baseUrl);
    console.log('🔧 MCardService initialized with baseUrl:', this.baseUrl);
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
   * Get MCard content by hash
   */
  async getMCardContent(hash: string, asText: boolean = false): Promise<string | Blob> {
    const url = `${this.baseUrl}/card/${hash}/content${asText ? '?as_text=true' : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch MCard content: ${response.statusText}`);
    }

    return asText ? await response.text() : await response.blob();
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
   * Search MCards
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
}

// Export singleton instance
export const mcardService = new MCardService();
