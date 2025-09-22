/**
 * Ollama Service - Handles interactions with the Ollama LLM API
 */

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message: OllamaMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaStreamResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export class OllamaService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get the Ollama API URL from environment or use default
   */
  private getOllamaUrl(): string {
    if (typeof window !== 'undefined' && window.RUNTIME_ENV?.PUBLIC_OLLAMA_URL) {
      return window.RUNTIME_ENV.PUBLIC_OLLAMA_URL;
    }
    return this.baseUrl;
  }

  /**
   * Check if Ollama service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.getOllamaUrl()}/api/version`);
      return response.ok;
    } catch (error) {
      console.error('Ollama service not available:', error);
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.getOllamaUrl()}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error('Failed to list models:', error);
      return [];
    }
  }

  /**
   * Generate a response from Ollama
   */
  async generate(
    model: string,
    messages: OllamaMessage[],
    options?: {
      temperature?: number;
      top_p?: number;
      top_k?: number;
      max_tokens?: number;
    }
  ): Promise<OllamaResponse> {
    try {
      const response = await fetch(`${this.getOllamaUrl()}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          options: {
            temperature: options?.temperature || 0.7,
            top_p: options?.top_p || 0.9,
            top_k: options?.top_k || 40,
            num_predict: options?.max_tokens || 2048,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to generate response:', error);
      throw error;
    }
  }

  /**
   * Generate a streaming response from Ollama
   */
  async generateStream(
    model: string,
    messages: OllamaMessage[],
    onChunk: (chunk: OllamaStreamResponse) => void,
    options?: {
      temperature?: number;
      top_p?: number;
      top_k?: number;
      max_tokens?: number;
    }
  ): Promise<void> {
    try {
      const response = await fetch(`${this.getOllamaUrl()}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          options: {
            temperature: options?.temperature || 0.7,
            top_p: options?.top_p || 0.9,
            top_k: options?.top_k || 40,
            num_predict: options?.max_tokens || 2048,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunk = JSON.parse(line);
              onChunk(chunk);
            } catch (error) {
              console.warn('Failed to parse chunk:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to generate streaming response:', error);
      throw error;
    }
  }

  /**
   * Pull a model if it doesn't exist
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.getOllamaUrl()}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`);
      }

      // Handle streaming response for model download progress
      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const progress = JSON.parse(line);
            if (progress.status) {
              console.log(`Model pull progress: ${progress.status}`);
            }
          } catch (error) {
            // Ignore parse errors for progress updates
          }
        }
      }
    } catch (error) {
      console.error('Failed to pull model:', error);
      throw error;
    }
  }
}

// Create default instance
export const ollamaService = new OllamaService();
