/**
 * RAG Service - Handles Retrieval-Augmented Generation using MCard and Ollama
 */

import { ollamaService, type OllamaMessage } from './ollama-service';
import defaultMCardService from './MCardService';

export interface RAGQuery {
  query: string;
  max_sources?: number;
  model?: string;
  temperature?: number;
}

export interface RAGResponse {
  query: string;
  answer: string;
  citations: RAGCitation[];
  total_sources: number;
  response_time_ms: number;
  model_used: string;
}

export interface RAGCitation {
  hash: string;
  g_time: string;
  section: string;
  content: string;
  relevance_score: number;
}

export interface DocumentContext {
  hash: string;
  content: string;
  content_type: string;
  relevance_score?: number;
}

export class RAGService {
  private ragApiUrl: string;
  private mcardApiUrl: string;
  private defaultModel: string = 'qwen2.5:0.5b';

  constructor() {
    this.ragApiUrl = this.getRagApiUrl();
    this.mcardApiUrl = this.getMcardApiUrl();
  }

  /**
   * Get RAG API URL from environment or use default
   */
  private getRagApiUrl(): string {
    if (typeof window !== 'undefined' && window.RUNTIME_ENV?.PUBLIC_RAG_API_URL) {
      return window.RUNTIME_ENV.PUBLIC_RAG_API_URL;
    }
    return 'http://localhost:28302/api/v1';
  }

  /**
   * Get MCard API URL from environment or use default
   */
  private getMcardApiUrl(): string {
    if (typeof window !== 'undefined' && window.RUNTIME_ENV?.PUBLIC_MCARD_API_URL) {
      return window.RUNTIME_ENV.PUBLIC_MCARD_API_URL;
    }
    return 'http://localhost:49384/v1';
  }

  /**
   * Check if RAG service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.ragApiUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('RAG service not available:', error);
      return false;
    }
  }

  /**
   * Get RAG service status
   */
  async getStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.ragApiUrl}/status`);
      if (!response.ok) {
        throw new Error(`Failed to get RAG status: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get RAG status:', error);
      throw error;
    }
  }

  /**
   * Query documents using the RAG service
   */
  async queryWithRAGService(query: string, maxSources: number = 3): Promise<RAGResponse> {
    try {
      const response = await fetch(`${this.ragApiUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          max_sources: maxSources,
        }),
      });

      if (!response.ok) {
        throw new Error(`RAG query failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('RAG query failed:', error);
      throw error;
    }
  }

  /**
   * Search documents in MCard service
   */
  async searchDocuments(query: string, limit: number = 5): Promise<DocumentContext[]> {
    try {
      const response = await fetch(`${this.mcardApiUrl}/cards/search?query=${encodeURIComponent(query)}&page_size=${limit}`);
      if (!response.ok) {
        throw new Error(`MCard search failed: ${response.statusText}`);
      }

      const data = await response.json();
      const documents: DocumentContext[] = [];

      for (const item of data.items || []) {
        try {
          // Get document content
          const contentResponse = await fetch(`${this.mcardApiUrl}/card/${item.hash}/content?as_text=true`);
          if (contentResponse.ok) {
            const content = await contentResponse.text();
            documents.push({
              hash: item.hash,
              content: content.substring(0, 2000), // Limit content length
              content_type: item.content_type,
              relevance_score: item.score || 0,
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch content for document ${item.hash}:`, error);
        }
      }

      return documents;
    } catch (error) {
      console.error('Document search failed:', error);
      return [];
    }
  }

  /**
   * Generate RAG response using local services (MCard + Ollama)
   */
  async queryWithLocalRAG(
    query: string,
    options: {
      maxSources?: number;
      model?: string;
      temperature?: number;
    } = {}
  ): Promise<RAGResponse> {
    const startTime = Date.now();
    const maxSources = options.maxSources || 3;
    const model = options.model || this.defaultModel;
    const temperature = options.temperature || 0.7;

    try {
      // Step 1: Search for relevant documents
      console.log('🔍 Searching for relevant documents...');
      const documents = await this.searchDocuments(query, maxSources);

      if (documents.length === 0) {
        // No documents found, use Ollama without context
        const messages: OllamaMessage[] = [
          {
            role: 'system',
            content: 'You are a helpful assistant. Answer the user\'s question to the best of your ability.'
          },
          {
            role: 'user',
            content: query
          }
        ];

        const ollamaResponse = await ollamaService.generate(model, messages, {
          temperature,
          max_tokens: 1024,
        });

        return {
          query,
          answer: ollamaResponse.message.content,
          citations: [],
          total_sources: 0,
          response_time_ms: Date.now() - startTime,
          model_used: model,
        };
      }

      // Step 2: Create context from retrieved documents
      const context = documents.map((doc, index) => 
        `[Document ${index + 1}] (Hash: ${doc.hash.substring(0, 8)})\n${doc.content}`
      ).join('\n\n');

      // Step 3: Generate response using Ollama with context
      console.log('🤖 Generating response with context...');
      const messages: OllamaMessage[] = [
        {
          role: 'system',
          content: `You are a helpful assistant that answers questions based on the provided context documents. 
Use the information from the documents to answer the user's question. If the documents don't contain relevant information, say so clearly.
Always cite which document(s) you're referencing in your answer.

Context Documents:
${context}`
        },
        {
          role: 'user',
          content: query
        }
      ];

      const ollamaResponse = await ollamaService.generate(model, messages, {
        temperature,
        max_tokens: 1024,
      });

      // Step 4: Format citations
      const citations: RAGCitation[] = documents.map((doc, index) => ({
        hash: doc.hash,
        g_time: new Date().toISOString(), // We don't have g_time from search, use current time
        section: `document_${index + 1}`,
        content: doc.content.substring(0, 500), // Truncate for citation
        relevance_score: doc.relevance_score || 0,
      }));

      return {
        query,
        answer: ollamaResponse.message.content,
        citations,
        total_sources: documents.length,
        response_time_ms: Date.now() - startTime,
        model_used: model,
      };

    } catch (error) {
      console.error('Local RAG query failed:', error);
      throw error;
    }
  }

  /**
   * Main query method - tries RAG service first, falls back to local RAG
   */
  async query(
    query: string,
    options: {
      maxSources?: number;
      model?: string;
      temperature?: number;
      useLocalRAG?: boolean;
    } = {}
  ): Promise<RAGResponse> {
    // If explicitly requested to use local RAG or if RAG service is not available
    if (options.useLocalRAG || !(await this.isAvailable())) {
      console.log('📚 Using local RAG (MCard + Ollama)');
      return this.queryWithLocalRAG(query, options);
    }

    try {
      console.log('🌐 Using RAG service');
      return await this.queryWithRAGService(query, options.maxSources);
    } catch (error) {
      console.warn('RAG service failed, falling back to local RAG:', error);
      return this.queryWithLocalRAG(query, options);
    }
  }

  /**
   * Get vector store statistics
   */
  async getVectorStats(): Promise<any> {
    try {
      const response = await fetch(`${this.ragApiUrl}/vector-stats`);
      if (!response.ok) {
        throw new Error(`Failed to get vector stats: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get vector stats:', error);
      return null;
    }
  }

  /**
   * List documents in MCard
   */
  async listDocuments(page: number = 1, pageSize: number = 10): Promise<any> {
    try {
      const response = await fetch(`${this.ragApiUrl}/documents?page=${page}&page_size=${pageSize}`);
      if (!response.ok) {
        throw new Error(`Failed to list documents: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to list documents:', error);
      return { documents: [], total: 0 };
    }
  }

  /**
   * Index all documents for RAG
   */
  async indexAllDocuments(): Promise<any> {
    try {
      const response = await fetch(`${this.ragApiUrl}/index-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Failed to index documents: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to index documents:', error);
      throw error;
    }
  }
}

// Create default instance
export const ragService = new RAGService();
