import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { RAGService, type RAGHealthResponse, type RAGStats, type RAGQueryResult } from '@/services/RAGService';
import { RAGStatusBar } from './RAGStatusBar';
import { RAGControls } from './RAGControls';
import { RAGChat } from './RAGChat';

interface RAGBrowserProps {
  className?: string;
}

export function RAGBrowser({ className }: RAGBrowserProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
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
      // For now, we'll just fetch the documents from MCard via the RAG API
      // In a more complete implementation, this would integrate with MCard directly
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
  
  // Function to clear vector store
  const handleClearVectorStore = async () => {
    try {
      setIsLoading(true);
      // Call the API to clear vector store
      await ragService.clearVectorStore();
      // Refresh stats after clearing
      await fetchHealthStatus();
    } catch (error) {
      console.error('Error clearing vector store:', error);
    } finally {
      setIsLoading(false);
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

  // Handle layout based on mobile or desktop view
  if (isMobile) {
    // Mobile layout: stacked panels
    return (
      <div className={cn("h-full flex flex-col", className)}>
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

        {/* Status bar panel */}
        <div className="border-b p-4">
          <RAGStatusBar 
            health={healthData} 
            stats={stats} 
            loading={isLoading} 
          />
        </div>

        {/* Controls panel */}
        <div className="border-b p-4">
          <RAGControls 
            onRetrieveFromMCard={handleRetrieveFromMCard}
            onIndexDocuments={handleIndexDocuments}
            onClearVectorStore={handleClearVectorStore}
            isIndexing={isIndexing}
            isRetrieving={isRetrieving}
          />
        </div>

        {/* Chat panel - fills remaining space */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <RAGChat 
            onQuery={handleQuery}
            className="h-full"
          />
        </div>
      </div>
    );
  }

  // Desktop layout: resizable panels
  return (
    <div className={cn("h-full flex flex-col", className)}>
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
      
      {/* Main content with resizable panels */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left panel - Control panel */}
        <ResizablePanel defaultSize={25} minSize={20}>
          <div className="h-full overflow-hidden flex flex-col">
            {/* Status bar */}
            <div className="flex-shrink-0 border-b p-4">
              <RAGStatusBar 
                health={healthData} 
                stats={stats} 
                loading={isLoading} 
              />
            </div>
            
            {/* Controls section */}
            <div className="flex-1 overflow-auto p-4">
              <RAGControls 
                onRetrieveFromMCard={handleRetrieveFromMCard}
                onIndexDocuments={handleIndexDocuments}
                onClearVectorStore={handleClearVectorStore}
                isIndexing={isIndexing}
                isRetrieving={isRetrieving}
              />
            </div>
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        {/* Right panel - Chat interface */}
        <ResizablePanel defaultSize={75}>
          <div className="h-full overflow-hidden">
            <RAGChat 
              onQuery={handleQuery}
              className="h-full"
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
