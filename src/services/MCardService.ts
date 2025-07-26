/**
 * MCardService - Handles all interactions with the MCard API
 */
import { MCARD_API_URL } from '../config';
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

  constructor(baseUrl?: string) {
    // Use provided baseUrl or the centralized config value
    this.baseUrl = baseUrl || MCARD_API_URL;
    console.log('MCardService initialized with baseUrl:', this.baseUrl);
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
      const requestUrl = `${this.baseUrl}${path}`;
      console.log(`API Request: ${options.method || 'GET'} ${requestUrl}`);
      
      if (options.body instanceof FormData) {
        console.log('FormData entries:');
        // Log FormData entries for debugging
        for (const pair of (options.body as FormData).entries()) {
          if (pair[0] === 'file') {
            const file = pair[1] as File;
            console.log(`- ${pair[0]}: File(${file.name}, ${file.type}, ${file.size} bytes)`);
          } else {
            console.log(`- ${pair[0]}: ${pair[1]}`);
          }
        }
      }
      
      const response = await fetch(requestUrl, options);
      
      console.log(`API Response: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        // Try to get more error details from the response
        let errorDetails = '';
        try {
          const errorJson = await response.clone().json();
          errorDetails = JSON.stringify(errorJson);
        } catch (e) {
          try {
            errorDetails = await response.clone().text();
          } catch (e2) {
            errorDetails = 'Could not extract error details';
          }
        }
        
        throw new Error(`API error (${response.status}): ${response.statusText}\nDetails: ${errorDetails}`);
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
