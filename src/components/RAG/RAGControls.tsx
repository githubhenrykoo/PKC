import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RAGControlsProps {
  onRetrieveFromMCard: () => void;
  onIndexDocuments: () => void;
  onClearVectorStore: () => void;
  isIndexing: boolean;
  isRetrieving: boolean;
  className?: string;
}

export function RAGControls({ 
  onRetrieveFromMCard, 
  onIndexDocuments, 
  onClearVectorStore,
  isIndexing, 
  isRetrieving,
  className 
}: RAGControlsProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearClick = () => {
    if (showClearConfirm) {
      onClearVectorStore();
      setShowClearConfirm(false);
    } else {
      setShowClearConfirm(true);
      // Auto-hide confirmation after 3 seconds
      setTimeout(() => setShowClearConfirm(false), 3000);
    }
  };

  return (
    <div className={cn("p-4 border-b bg-background", className)}>
      <div className="space-y-4">
        {/* Title */}
        <div>
          <h3 className="text-lg font-semibold">Document Management</h3>
          <p className="text-sm text-muted-foreground">
            Retrieve documents from MCard and index them for RAG queries
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={onRetrieveFromMCard}
            disabled={isRetrieving || isIndexing}
            variant="default"
            className="min-w-[140px]"
          >
            {isRetrieving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Retrieving...
              </>
            ) : (
              'Retrieve from MCard'
            )}
          </Button>

          <Button
            onClick={onIndexDocuments}
            disabled={isIndexing || isRetrieving}
            variant="secondary"
            className="min-w-[120px]"
          >
            {isIndexing ? (
              <>
                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin mr-2" />
                Indexing...
              </>
            ) : (
              'Index Documents'
            )}
          </Button>

          <Button
            onClick={handleClearClick}
            disabled={isIndexing || isRetrieving}
            variant={showClearConfirm ? "destructive" : "outline"}
            className="min-w-[100px]"
          >
            {showClearConfirm ? 'Confirm Clear?' : 'Clear Index'}
          </Button>
        </div>

        {/* Help text */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• <strong>Retrieve from MCard:</strong> Fetch all documents from your MCard database</p>
          <p>• <strong>Index Documents:</strong> Process and index documents for semantic search</p>
          <p>• <strong>Clear Index:</strong> Remove all indexed data (documents will remain in MCard)</p>
        </div>
      </div>
    </div>
  );
}
