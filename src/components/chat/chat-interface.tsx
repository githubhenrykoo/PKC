/**
 * Chat Interface Component - Ollama LLM with RAG capabilities
 */

import React, { useState, useEffect, useRef } from 'react';
import { ragService, type RAGResponse } from '../../services/rag-service';
import { ollamaService } from '../../services/ollama-service';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citations?: any[];
  model?: string;
  responseTime?: number;
}

interface ChatInterfaceProps {
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ className = '' }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('qwen2.5:0.5b');
  const [useRAG, setUseRAG] = useState(true);
  const [ragStats, setRagStats] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check service availability on mount
  useEffect(() => {
    checkServices();
    loadModels();
    loadRagStats();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkServices = async () => {
    try {
      const ollamaAvailable = await ollamaService.isAvailable();
      const ragAvailable = await ragService.isAvailable();
      setIsConnected(ollamaAvailable);
      
      if (!ollamaAvailable) {
        console.warn('Ollama service not available at http://localhost:11434');
      }
      if (!ragAvailable) {
        console.warn('RAG service not available at http://localhost:28302');
      }
    } catch (error) {
      console.error('Failed to check services:', error);
      setIsConnected(false);
    }
  };

  const loadModels = async () => {
    try {
      const models = await ollamaService.listModels();
      setAvailableModels(models);
      
      // Set default model if available
      if (models.length > 0) {
        const preferredModels = ['qwen2.5:0.5b', 'llama3', 'llama3.2', 'qwen2.5'];
        const defaultModel = preferredModels.find(model => models.includes(model)) || models[0];
        setSelectedModel(defaultModel);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const loadRagStats = async () => {
    try {
      const stats = await ragService.getVectorStats();
      setRagStats(stats);
    } catch (error) {
      console.warn('Failed to load RAG stats:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      let response: RAGResponse;
      
      if (useRAG) {
        // Use RAG for enhanced responses
        response = await ragService.query(userMessage.content, {
          model: selectedModel,
          maxSources: 3,
          temperature: 0.7,
        });
      } else {
        // Use Ollama directly without RAG
        const ollamaResponse = await ollamaService.generate(selectedModel, [
          {
            role: 'system',
            content: 'You are a helpful assistant. Answer questions clearly and concisely.',
          },
          {
            role: 'user',
            content: userMessage.content,
          },
        ]);

        response = {
          query: userMessage.content,
          answer: ollamaResponse.message.content,
          citations: [],
          total_sources: 0,
          response_time_ms: 0,
          model_used: selectedModel,
        };
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        citations: response.citations,
        model: response.model_used,
        responseTime: response.response_time_ms,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to get response:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please make sure the Ollama service is running on http://localhost:11434.`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Assistant {useRAG ? '(RAG Enhanced)' : ''}
          </h3>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
            disabled={!isConnected}
          >
            {availableModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>

          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={useRAG}
              onChange={(e) => setUseRAG(e.target.checked)}
              className="rounded"
            />
            <span className="text-gray-700 dark:text-gray-300">Use RAG</span>
          </label>

          {ragStats && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {ragStats.total_chunks} chunks indexed
            </span>
          )}

          <button
            onClick={clearChat}
            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <p>Start a conversation with the AI assistant.</p>
            {useRAG && (
              <p className="text-sm mt-2">
                RAG is enabled - I can search through your documents to provide better answers.
              </p>
            )}
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              {/* Message metadata */}
              <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                <span>{formatTimestamp(message.timestamp)}</span>
                {message.role === 'assistant' && (
                  <div className="flex items-center space-x-2">
                    {message.model && (
                      <span>{message.model}</span>
                    )}
                    {message.responseTime && (
                      <span>{Math.round(message.responseTime)}ms</span>
                    )}
                    {message.citations && message.citations.length > 0 && (
                      <span>{message.citations.length} sources</span>
                    )}
                  </div>
                )}
              </div>

              {/* Citations */}
              {message.citations && message.citations.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-300 dark:border-gray-600">
                  <div className="text-xs font-medium mb-1">Sources:</div>
                  {message.citations.map((citation, index) => (
                    <div key={index} className="text-xs bg-gray-50 dark:bg-gray-700 rounded p-2 mb-1">
                      <div className="font-medium">Document {citation.hash?.substring(0, 8)}</div>
                      <div className="text-gray-600 dark:text-gray-400 mt-1">
                        {citation.content?.substring(0, 100)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                <span className="text-gray-600 dark:text-gray-400">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Ask me anything..." : "Ollama service not available"}
            className="flex-1 resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={!isConnected || isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!isConnected || isLoading || !inputValue.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        
        {!isConnected && (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400">
            Make sure Ollama is running: <code>docker compose up -d</code>
          </div>
        )}
      </div>
    </div>
  );
};
