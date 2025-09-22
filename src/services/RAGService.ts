export interface RAGDocument {
  hash: string;
  content_type: string;
  g_time: string;
  indexed?: boolean;
  filename?: string;
}

export interface RAGQueryResult {
  query: string;
  answer: string;
  citations: RAGCitation[];
  total_sources: number;
  response_time_ms: number;
}

export interface RAGCitation {
  hash: string;
  g_time: string;
  section: string;
  content: string;
  relevance_score: number;
}

export interface RAGStats {
  total_chunks: number;
  unique_documents: number;
  collection_name: string;
  supported_content_types: string[];
}

export interface RAGHealthResponse {
  status: 'healthy' | 'unhealthy';
  mcard_healthy: boolean;
  timestamp: string;
}

export interface RAGUploadResponse {
  hash: string;
  content_type: string;
  message: string;
}

export interface RAGIndexResponse {
  hash: string;
  chunks_created: number;
  embeddings_created: number;
  message: string;
}

export interface RAGBulkIndexResponse {
  total_documents: number;
  processed_documents: number;
  skipped_documents: number;
  created_chunks: number;
  processing_time_ms: number;
  message: string;
}

export class RAGService {
  private baseUrl: string;

  constructor() {
    // Use RAG API base URL from runtime environment (dynamically loaded) or fallback
    this.baseUrl = window.RUNTIME_ENV?.PUBLIC_RAG_API_URL || 
                   (typeof import.meta !== 'undefined' ? import.meta.env?.PUBLIC_RAG_API_URL : undefined) ||
                   'http://localhost:28302/api/v1';
    
    // Debug: Log the configured URL and source
    const source = window.RUNTIME_ENV?.PUBLIC_RAG_API_URL ? 'window.RUNTIME_ENV' : 
                   (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_RAG_API_URL) ? 'import.meta.env' : 
                   'fallback';
    console.log('🔧 RAG_API_URL configured as:', this.baseUrl);
    console.log('🔧 RAGService initialized with baseUrl:', this.baseUrl);
    console.log('🔧 Environment source:', source);
  }

  // Health and Status
  async getHealth(): Promise<RAGHealthResponse> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    return response.json();
  }

  async getStatus(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/status`);
    if (!response.ok) {
      throw new Error(`Status check failed: ${response.statusText}`);
    }
    return response.json();
  }

  // Document Management
  async getDocuments(page: number = 1, pageSize: number = 10): Promise<{ documents: RAGDocument[]; total: number; page: number; page_size: number; has_next: boolean }> {
    const response = await fetch(`${this.baseUrl}/documents?page=${page}&page_size=${pageSize}`);
    if (!response.ok) {
      throw new Error(`Failed to get documents: ${response.statusText}`);
    }
    return response.json();
  }

  async uploadDocument(file: File): Promise<RAGUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    return response.json();
  }

  // Indexing Operations
  async indexDocument(hash: string): Promise<RAGIndexResponse> {
    const response = await fetch(`${this.baseUrl}/index`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hash }),
    });

    if (!response.ok) {
      throw new Error(`Failed to index document: ${response.statusText}`);
    }
    return response.json();
  }

  async indexAllDocuments(chunkSize: number = 500): Promise<RAGBulkIndexResponse> {
    const response = await fetch(`${this.baseUrl}/index-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chunk_size: chunkSize }),
    });

    if (!response.ok) {
      throw new Error(`Failed to index all documents: ${response.statusText}`);
    }
    return response.json();
  }

  // Vector Store Operations
  async getVectorStats(): Promise<RAGStats> {
    const response = await fetch(`${this.baseUrl}/vector-stats`);
    if (!response.ok) {
      throw new Error(`Failed to get vector stats: ${response.statusText}`);
    }
    return response.json();
  }

  async clearVectorStore(): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/clear`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to clear vector store: ${response.statusText}`);
    }
    return response.json();
  }

  // Query Operations
  async queryDocuments(query: string, maxSources: number = 3): Promise<RAGQueryResult> {
    // First, ensure we have the latest document list to help resolve hashes
    let documents: RAGDocument[] = [];
    try {
      const docsResponse = await this.getDocuments(1, 100);
      documents = docsResponse.documents;

      // Import and use the RAGHashResolver
      const { ragHashResolver } = await import('./RAGHashResolver');
      ragHashResolver.updateDocumentCache(documents);
    } catch (error) {
      console.warn('Failed to get documents for hash resolution:', error);
      // Continue even if we can't get documents - at least we'll get query results
    }

    // Perform the query as normal
    const response = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query, 
        max_sources: maxSources 
      }),
    });

    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`);
    }

    // Get the query result
    const queryResult: RAGQueryResult = await response.json();
    
    // Fix unknown hashes if possible
    try {
      const { ragHashResolver } = await import('./RAGHashResolver');
      if (ragHashResolver.hasMappings()) {
        return ragHashResolver.resolveHashes(queryResult);
      }
    } catch (error) {
      console.warn('Failed to resolve hashes:', error);
    }
    
    return queryResult;
  }
}
