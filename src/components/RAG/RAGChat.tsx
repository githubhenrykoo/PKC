import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RAGQueryResult, RAGHealthResponse, RAGStats } from '@/services/RAGService';
import { MCardService } from '@/services/MCardService';

// Utility function to remove markdown formatting
const stripMarkdown = (text: string): string => {
  return text
    // Remove bold formatting (**text** or __text__)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    // Remove italic formatting (*text* or _text_)
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    // Remove headers (# ## ### etc.)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bullet points (- or * at start of line)
    .replace(/^[\s]*[-*]\s+/gm, '')
    // Remove numbered lists (1. 2. etc.)
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove code blocks (```code```)
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code (`code`)
    .replace(/`([^`]+)`/g, '$1')
    // Remove links [text](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove strikethrough (~~text~~)
    .replace(/~~(.*?)~~/g, '$1')
    // Remove blockquotes (> text)
    .replace(/^>\s+/gm, '')
    // Clean up extra whitespace and newlines
    .replace(/\n\s*\n/g, '\n')
    .trim();
};

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  result?: RAGQueryResult;
}

interface RAGChatProps {
  onQuery: (query: string, maxSources: number) => Promise<RAGQueryResult>;
  health: RAGHealthResponse | null;
  stats: RAGStats | null;
  loading: boolean;
  onRetrieveFromMCard: () => Promise<void>;
  onIndexDocuments: () => Promise<void>;
  isRetrieving: boolean;
  isIndexing: boolean;
  className?: string;
}

export function RAGChat({ onQuery, health, stats, loading, onRetrieveFromMCard, onIndexDocuments, isRetrieving, isIndexing, className }: RAGChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [maxSources, setMaxSources] = useState(3);
  const [autoSaveToMCard, setAutoSaveToMCard] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mcardService = useRef(new MCardService()).current;

  // Generate unique session ID
  const generateSessionId = (): string => {
    return `rag-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Save messages to localStorage
  const saveMessagesToCache = (messagesToSave: ChatMessage[]) => {
    try {
      const cacheData = {
        sessionId,
        messages: messagesToSave,
        lastUpdated: new Date().toISOString(),
        maxSources,
      };
      localStorage.setItem(`rag-chat-${sessionId}`, JSON.stringify(cacheData));
      console.log('💾 Chat messages saved to cache');
    } catch (error) {
      console.error('❌ Failed to save messages to cache:', error);
    }
  };

  // Load messages from localStorage
  const loadMessagesFromCache = (): ChatMessage[] => {
    try {
      // Try to get the current session first
      if (sessionId) {
        const cached = localStorage.getItem(`rag-chat-${sessionId}`);
        if (cached) {
          const cacheData = JSON.parse(cached);
          return (cacheData.messages || []).map((message: any) => ({
            ...message,
            timestamp: new Date(message.timestamp) // Convert string to Date object
          }));
        }
      }

      // If no current session, try to find the most recent session
      const keys = Object.keys(localStorage);
      const ragChatKeys = keys.filter(key => key.startsWith('rag-chat-')).sort();

      if (ragChatKeys.length > 0) {
        const mostRecentKey = ragChatKeys[ragChatKeys.length - 1];
        const cached = localStorage.getItem(mostRecentKey);
        if (cached) {
          const cacheData = JSON.parse(cached);
          setSessionId(cacheData.sessionId);
          return (cacheData.messages || []).map((message: any) => ({
            ...message,
            timestamp: new Date(message.timestamp) // Convert string to Date object
          }));
        }
      }

      return [];
    } catch (error) {
      console.error('❌ Failed to load messages from cache:', error);
      return [];
    }
  };

  // Clear old chat sessions (older than 7 days)
  const clearOldChatSessions = () => {
    try {
      const keys = Object.keys(localStorage);
      const ragChatKeys = keys.filter(key => key.startsWith('rag-chat-'));
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      let clearedCount = 0;
      ragChatKeys.forEach(key => {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const cacheData = JSON.parse(cached);
            const lastUpdated = new Date(cacheData.lastUpdated);

            if (lastUpdated < sevenDaysAgo) {
              localStorage.removeItem(key);
              clearedCount++;
            }
          }
        } catch (error) {
          console.warn('⚠️ Failed to parse cached chat session:', key, error);
          localStorage.removeItem(key); // Remove corrupted data
          clearedCount++;
        }
      });

      if (clearedCount > 0) {
        console.log(`🧹 Cleared ${clearedCount} old chat sessions`);
      }
    } catch (error) {
      console.error('❌ Failed to clear old chat sessions:', error);
    }
  };

  // Clear current chat session
  const clearCurrentChat = () => {
    setMessages([]);
    setInput('');
    setSessionId(generateSessionId());
  };

  // Initialize session and load messages on mount
  useEffect(() => {
    // Generate or restore session ID
    let currentSessionId = localStorage.getItem('current-rag-session-id');
    if (!currentSessionId) {
      currentSessionId = generateSessionId();
      localStorage.setItem('current-rag-session-id', currentSessionId);
    }
    setSessionId(currentSessionId);

    // Clear old sessions
    clearOldChatSessions();

    // Load messages from cache
    const cachedMessages = loadMessagesFromCache();
    if (cachedMessages.length > 0) {
      setMessages(cachedMessages);
    }
  }, []);

  // Save messages to cache whenever messages change
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      saveMessagesToCache(messages);
    }
  }, [messages, sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to save RAG conversation to MCard
  const saveConversationToMCard = async (query: string, result: RAGQueryResult, timestamp: Date) => {
    try {
      const conversationData = {
        type: 'rag_conversation',
        timestamp: timestamp.toISOString(),
        query: query,
        answer: result.answer,
        citations: result.citations.map(citation => ({
          hash: citation.hash,
          g_time: citation.g_time,
          section: citation.section,
          content: citation.content,
          relevance_score: citation.relevance_score
        })),
        total_sources: result.total_sources,
        response_time_ms: result.response_time_ms,
        max_sources_requested: maxSources
      };

      // Convert to JSON string and create a Blob
      const jsonString = JSON.stringify(conversationData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Save to MCard
      const response = await mcardService.storeContent(blob);
      console.log('✅ RAG conversation saved to MCard:', response.hash);
      
      return response.hash;
    } catch (error) {
      console.error('❌ Failed to save RAG conversation to MCard:', error);
      // Don't throw - we don't want to interrupt the user experience
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const query = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const result = await onQuery(query, maxSources);
      
      // Add assistant response with markdown stripped
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: stripMarkdown(result.answer),
        timestamp: new Date(),
        result,
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Automatically save the conversation to MCard if enabled
      if (autoSaveToMCard) {
        await saveConversationToMCard(query, result, assistantMessage.timestamp);
      }
    } catch (error) {
      // Add error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      handleSubmit(e as any);
    }
  };

  // Function to fetch MCard content and display it in the content viewer
  const fetchAndDisplayMCardContent = async (hash: string) => {
    try {
      console.log('🔍 Fetching MCard content for hash:', hash);

      // Call the global loadMCardContent function that should be available
      if (window.loadMCardContent) {
        window.loadMCardContent(hash, `MCard: ${hash.substring(0, 8)}...`);
      } else {
        console.warn('loadMCardContent function not available');
        alert('Content viewer not available. Please ensure the main app is loaded.');
      }
    } catch (error) {
      console.error('❌ Failed to fetch MCard content:', error);
      alert(`Failed to load MCard content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className={cn("flex flex-col h-full min-h-0 w-full overflow-hidden", className)}>
      {/* Chat Header with Status Information */}
      <div className="flex-shrink-0 border-b bg-background">
        {/* Status Section */}
        <div className="p-4 border-b">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                health?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
              )} />
              <span className="font-medium">RAG Service:</span>
              <span className={cn(
                health?.status === 'healthy' ? 'text-green-600' : 'text-red-600'
              )}>
                {loading ? 'Loading...' : (health?.status === 'healthy' ? 'Online' : 'Offline')}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                health?.mcard_healthy ? 'bg-green-500' : 'bg-red-500'
              )} />
              <span className="font-medium">MCard:</span>
              <span className={cn(
                health?.mcard_healthy ? 'text-green-600' : 'text-red-600'
              )}>
                {health?.mcard_healthy ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium">Documents:</span>
              <span className="text-muted-foreground">
                {stats?.unique_documents || 0}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium">Chunks:</span>
              <span className="text-muted-foreground">
                {stats?.total_chunks || 0}
              </span>
            </div>
          </div>
        </div>
        
        {/* Document Management Controls */}
        <div className="p-4 border-b">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Retrieve from MCard */}
            <div className="flex flex-col">
              <Button 
                onClick={onRetrieveFromMCard} 
                disabled={isRetrieving}
                className="flex items-center justify-center space-x-2 mb-2"
              >
                {isRetrieving && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>Retrieve from MCard</span>
              </Button>
              <div className="text-xs text-muted-foreground">
                <strong>Retrieve from MCard:</strong> Fetch all documents from your MCard database
              </div>
            </div>
            
            {/* Index Documents */}
            <div className="flex flex-col">
              <Button 
                onClick={onIndexDocuments} 
                disabled={isIndexing}
                className="flex items-center justify-center space-x-2 mb-2"
              >
                {isIndexing && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>Index Documents</span>
              </Button>
              <div className="text-xs text-muted-foreground">
                <strong>Index Documents:</strong> Process and index documents for semantic search
              </div>
            </div>
          </div>
        </div>
        
        {/* Chat Header */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">RAG Chat</h3>
              <p className="text-sm text-muted-foreground">Ask questions about your documents</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Clear Chat Button */}
              {messages.length > 0 && (
                <Button
                  onClick={clearCurrentChat}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                  title="Clear chat history"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden md:inline">Clear Chat</span>
                </Button>
              )}

              {/* Max Sources Selector */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-muted-foreground">Max sources:</label>
                <select
                  value={maxSources}
                  onChange={(e) => setMaxSources(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="1">1</option>
                  <option value="3">3</option>
                  <option value="5">5</option>
                  <option value="10">10</option>
                </select>
              </div>
              
              {/* Auto-save to MCard Toggle */}
              <div className="flex items-center space-x-2">
                <label className="text-sm text-muted-foreground">Auto-save to MCard:</label>
                <button
                  onClick={() => setAutoSaveToMCard(!autoSaveToMCard)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
                    autoSaveToMCard ? "bg-green-600" : "bg-gray-300"
                  )}
                  role="switch"
                  aria-checked={autoSaveToMCard}
                  title={autoSaveToMCard ? "Auto-save enabled" : "Auto-save disabled"}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      autoSaveToMCard ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
                <span className={cn(
                  "text-xs font-medium",
                  autoSaveToMCard ? "text-green-600" : "text-gray-500"
                )}>
                  {autoSaveToMCard ? "YES" : "NO"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages - This container must flex-grow to fill available space */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0" style={{ display: 'flex', flexDirection: 'column' }}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full w-full text-muted-foreground" style={{ flexGrow: 1 }}>
            <div className="text-center space-y-2">
              <p className="text-lg">💬 Start a conversation</p>
              <p className="text-sm">Ask me anything about your indexed documents</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex w-full",
                message.type === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-2",
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <div className="text-sm">{message.content}</div>
                
                {/* Show citations for assistant messages */}
                {message.type === 'assistant' && message.result?.citations && message.result.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-current/20">
                    <div className="text-xs opacity-70 mb-2">Sources:</div>
                    <div className="space-y-1">
                      {message.result.citations.map((citation, idx) => (
                        <div key={idx} className="text-xs opacity-80 border-l-2 border-current/30 pl-2">
                          <div className="font-medium">
                            <span className="font-bold">Hash:</span>                            <button
                              onClick={() => fetchAndDisplayMCardContent(citation.hash)}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded cursor-pointer transition-colors"
                              title="Click to view MCard content"
                            >
                              {citation.hash}
                            </button>
                          </div>
                          <div className="font-medium">Score: {citation.relevance_score.toFixed(3)}</div>
                          <div className="truncate">{citation.content.substring(0, 100)}...</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                  {message.result && (
                    <span className="ml-2">({message.result.response_time_ms}ms)</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t bg-background w-full">
        <form onSubmit={handleSubmit} className="flex w-full space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your documents..."
            disabled={isLoading}
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
          />
          <Button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="px-6"
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
