import React from 'react';
import { cn } from "@/lib/utils";
import type { RAGHealthResponse, RAGStats } from '@/services/RAGService';

interface RAGStatusBarProps {
  health: RAGHealthResponse | null;
  stats: RAGStats | null;
  loading: boolean;
}

export function RAGStatusBar({ health, stats, loading }: RAGStatusBarProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-between p-3 bg-muted/30 border-b">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
          <span className="text-sm text-muted-foreground">Checking RAG service status...</span>
        </div>
      </div>
    );
  }

  const isHealthy = health?.status === 'healthy' && health?.mcard_healthy;
  const statusColor = isHealthy ? 'bg-green-500' : 'bg-red-500';
  const statusText = isHealthy ? 'Online' : 'Offline';

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 border-b">
      <div className="flex items-center space-x-4">
        {/* Service Status */}
        <div className="flex items-center space-x-2">
          <div className={cn("w-2 h-2 rounded-full", statusColor)} />
          <span className="text-sm font-medium">RAG Service: {statusText}</span>
        </div>
        
        {/* MCard Connection */}
        <div className="flex items-center space-x-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            health?.mcard_healthy ? 'bg-green-500' : 'bg-red-500'
          )} />
          <span className="text-sm text-muted-foreground">
            MCard: {health?.mcard_healthy ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Statistics */}
      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
        <span>Documents: {stats?.unique_documents || 0}</span>
        <span>Chunks: {stats?.total_chunks || 0}</span>
      </div>
    </div>
  );
}
