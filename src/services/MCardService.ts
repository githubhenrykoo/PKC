/**
 * MCardService - Handles all interactions with the MCard API
 */
import { getMcardApiUrl } from '../config';

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
    // Use provided baseUrl or get it dynamically from config
    this.baseUrl = baseUrl || getMcardApiUrl();
    console.log('MCardService initialized with baseUrl:', this.baseUrl);
  }
  
  /**
   * Updates the base URL used by this service instance
   * This can be used to update the URL after runtime environment is loaded
   */
  updateBaseUrl(newBaseUrl?: string) {
    this.baseUrl = newBaseUrl || getMcardApiUrl();
    console.log('MCardService base URL updated to:', this.baseUrl);
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
  
  // Get count of all cards
  async getCardCount(): Promise<MCardCountResponse> {
    return this._get(`/cards/count`);
  }
  
  // Delete a card by hash
  async deleteCard(hash: string): Promise<{ success: boolean; message: string }> {
    const response = await this._fetch(`/card/${hash}`, {
      method: 'DELETE'
    });
    return await response.json();
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
  
  // Upload file with enhanced error handling and size checks
  async uploadFile(file: File, metadata: Record<string, any> = {}): Promise<MCardItem> {
    // File size check (warn for files > 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      console.warn(`Large file detected: ${(file.size / 1024 / 1024).toFixed(2)}MB. This may take longer to upload.`);
    }
    
    // Check for empty files
    if (file.size === 0) {
      throw new Error('Cannot upload empty file');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Add enhanced metadata
    const enhancedMetadata = {
      filename: file.name,
      originalType: file.type || 'application/octet-stream',
      size: file.size,
      lastModified: file.lastModified,
      ...metadata
    };
    
    formData.append('metadata', JSON.stringify(enhancedMetadata));
    
    // Use direct API call - server CORS has been fixed
    console.log(`Uploading file: ${file.name}, type: ${file.type}, size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    return this._post('/files', formData, true);
  }
  
  // Helper methods with enhanced error handling
  private async _fetch(path: string, options: RequestInit = {}, isFileUpload = false): Promise<Response> {
    try {
      const requestUrl = `${this.baseUrl}${path}`;
      console.log(`API Request: ${options.method || 'GET'} ${requestUrl}`);
      
      // Enhanced logging for file uploads
      if (options.body instanceof FormData) {
        console.log('FormData entries:');
        let totalSize = 0;
        for (const pair of (options.body as FormData).entries()) {
          if (pair[0] === 'file') {
            const file = pair[1] as File;
            totalSize = file.size;
            console.log(`- ${pair[0]}: File(${file.name}, ${file.type || 'unknown'}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
          } else {
            console.log(`- ${pair[0]}: ${pair[1]}`);
          }
        }
        
        if (isFileUpload && totalSize > 0) {
          console.log(`Upload size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
          if (totalSize > 50 * 1024 * 1024) { // 50MB
            console.warn('Large file upload detected. This may take several minutes.');
          }
        }
      }
      
      // For file uploads, allow unlimited time - no timeout
      const response = isFileUpload 
        ? await fetch(requestUrl, options) // No timeout for file uploads
        : await Promise.race([
            fetch(requestUrl, options),
            new Promise<never>((_, reject) => {
              setTimeout(() => {
                reject(new Error('Request timeout after 30 seconds'));
              }, 30000); // Only timeout non-upload requests
            })
          ]);
      
      console.log(`API Response: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        // Enhanced error handling with specific messages for common issues
        let errorDetails = '';
        let userFriendlyMessage = '';
        
        try {
          const errorJson = await response.clone().json();
          errorDetails = JSON.stringify(errorJson, null, 2);
          
          // Extract user-friendly messages from API errors
          if (errorJson.detail) {
            userFriendlyMessage = errorJson.detail;
          } else if (errorJson.message) {
            userFriendlyMessage = errorJson.message;
          }
        } catch (e) {
          try {
            errorDetails = await response.clone().text();
          } catch (e2) {
            errorDetails = 'Could not extract error details';
          }
        }
        
        // Provide specific error messages for common HTTP status codes
        switch (response.status) {
          case 413:
            userFriendlyMessage = 'File is too large. The server has a file size limit.';
            break;
          case 400:
            if (!userFriendlyMessage) {
              userFriendlyMessage = 'Bad request. The file format may not be supported or the request is malformed.';
            }
            break;
          case 500:
            userFriendlyMessage = 'Server error. The upload service may be temporarily unavailable.';
            break;
          case 502:
          case 503:
          case 504:
            userFriendlyMessage = 'Service temporarily unavailable. Please try again in a moment.';
            break;
        }
        
        const finalMessage = userFriendlyMessage || `API error (${response.status}): ${response.statusText}`;
        throw new Error(`${finalMessage}\n\nTechnical details: ${errorDetails}`);
      }
      
      return response;
    } catch (error) {
      console.error('MCard API error:', error);
      
      // Enhanced error messages for network issues
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to the upload service. Please check your internet connection and try again.');
      }
      
      throw error;
    }
  }

  private async _get(path: string): Promise<any> {
    const response = await this._fetch(path);
    return await response.json();
  }

  private async _post(path: string, body: FormData | URLSearchParams | string, isFileUpload = false): Promise<any> {
    const options: RequestInit = {
      method: 'POST',
      body
    };
    
    // For file uploads, we don't set timeout on the request itself
    // but we can add progress tracking in the future
    const response = await this._fetch(path, options, isFileUpload);
    return await response.json();
  }
}

// Add default export for compatibility with existing imports
const defaultMCardService = new MCardService();
export default defaultMCardService;
