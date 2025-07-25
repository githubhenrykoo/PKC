/**
 * MCardService - Handles all interactions with the MCard API
 */
export interface MCardItem {
  hash: string;
  content_type: string;
  g_time: string;
  score?: number;
}

export interface MCardListResponse {
  items: MCardItem[];
  page: number;
  page_size: number;
  total_items: number;
  total_pages?: number;
  has_next?: boolean;
  has_previous?: boolean;
  query?: string;
}

export interface MCardCountResponse {
  count: number;
}

export class MCardService {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:49384/v1') {
    this.baseUrl = baseUrl;
  }

  // List all cards with pagination
  async listCards(page = 1, pageSize = 10): Promise<MCardListResponse> {
    return this._get(`/cards?page=${page}&page_size=${pageSize}`);
  }
  
  // Search cards by content
  async searchCards(query: string, page = 1, pageSize = 10): Promise<MCardListResponse> {
    return this._get(
      `/cards/search?query=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}`
    );
  }
  
  // Search cards by partial hash
  async searchByHash(partialHash: string, page = 1, pageSize = 10): Promise<MCardListResponse> {
    return this._get(
      `/cards/search-by-hash/${partialHash}?page=${page}&page_size=${pageSize}`
    );
  }
  
  // Get card count
  async getCardCount(): Promise<MCardCountResponse> {
    return this._get('/cards/count');
  }
  
  // Get card content
  async getCardContent(hash: string, asText = false): Promise<Blob | string> {
    const url = `/card/${hash}/content${asText ? '?as_text=true' : ''}`;
    const response = await this._fetch(url);
    return asText ? await response.text() : await response.blob();
  }
  
  // Get card metadata
  async getCardMetadata(hash: string): Promise<MCardItem> {
    return this._get(`/card/${hash}/metadata`);
  }
  
  // Get card content type
  async getCardContentType(hash: string): Promise<{ content_type: string }> {
    return this._get(`/card/${hash}/content-type`);
  }
  
  // Store content
  async storeContent(content: string | Blob): Promise<MCardItem> {
    const formData = new FormData();
    formData.append('content', content);
    return this._post('/card', formData);
  }
  
  // Upload file
  async uploadFile(file: File, metadata: Record<string, any> = {}): Promise<MCardItem> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (Object.keys(metadata).length > 0) {
      formData.append('metadata', JSON.stringify(metadata));
    }
    
    return this._post('/files', formData);
  }
  
  // Helper methods
  private async _fetch(path: string, options: RequestInit = {}): Promise<Response> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, options);
      if (!response.ok) {
        throw new Error(`API error (${response.status}): ${response.statusText}`);
      }
      return response;
    } catch (error) {
      console.error('MCard API error:', error);
      throw error;
    }
  }

  private async _get(path: string): Promise<any> {
    const response = await this._fetch(path);
    return await response.json();
  }

  private async _post(path: string, body: FormData | URLSearchParams | string): Promise<any> {
    const options: RequestInit = {
      method: 'POST',
      body
    };
    
    const response = await this._fetch(path, options);
    return await response.json();
  }
}
