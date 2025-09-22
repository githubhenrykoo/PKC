import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { RAGService, type RAGHealthResponse, type RAGStats, type RAGQueryResult } from '@/services/RAGService';
import { RAGChat } from './RAGChat';

interface RAGBrowserProps {
  className?: string;
}

export function RAGBrowser({ className }: RAGBrowserProps) {
  const [healthData, setHealthData] = useState<RAGHealthResponse | null>(null);
  const [stats, setStats] = useState<RAGStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isRetrieving, setIsRetrieving] = useState(false);
  
  const ragService = new RAGService();

  // Function to fetch health status
  const fetchHealthStatus = async () => {
    try {
      setIsLoading(true);
      const health = await ragService.getHealth();
      setHealthData(health);
      
      const statsData = await ragService.getVectorStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching RAG health status:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to retrieve documents from MCard
  const handleRetrieveFromMCard = async () => {
    try {
      setIsRetrieving(true);
      // Call the API to retrieve documents from MCard
      await ragService.getDocuments(1, 100); // Get the first 100 documents
      // Refresh stats after retrieving
      await fetchHealthStatus();
    } catch (error) {
      console.error('Error retrieving from MCard:', error);
    } finally {
      setIsRetrieving(false);
    }
  };
  
  // Function to index documents
  const handleIndexDocuments = async () => {
    try {
      setIsIndexing(true);
      // Call the API to index all documents
      await ragService.indexAllDocuments();
      // Refresh stats after indexing
      await fetchHealthStatus();
    } catch (error) {
      console.error('Error indexing documents:', error);
    } finally {
      setIsIndexing(false);
    }
  };
  
  // Function to handle chat queries
  const handleQuery = async (query: string, maxSources: number): Promise<RAGQueryResult> => {
    return await ragService.queryDocuments(query, maxSources);
  };

  useEffect(() => {
    fetchHealthStatus();
    
    // Refresh health status every 30 seconds
    const intervalId = setInterval(fetchHealthStatus, 30000);
    return () => clearInterval(intervalId);
  }, []);

  // Single panel layout - no mobile/desktop distinction
  return (
    <div className={cn("h-full w-full flex flex-col overflow-hidden", className)}>
      {/* Header with service name */}
      <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 12 2c-3.3 0-6 2.7-6 6 0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/>
                <path d="M9 18h6"/>
                <path d="M10 22h4"/>
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold">RAG Intelligence</h1>
              <p className="text-sm text-muted-foreground">Ask questions about your documents</p>
            </div>
          </div>
        </div>
      </div>

      {/* Single Chat Panel - fills remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <RAGChat 
          onQuery={handleQuery}
          health={healthData}
          stats={stats}
          loading={isLoading}
          onRetrieveFromMCard={handleRetrieveFromMCard}
          onIndexDocuments={handleIndexDocuments}
          isRetrieving={isRetrieving}
          isIndexing={isIndexing}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}
