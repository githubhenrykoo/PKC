import React from 'react';
import { MCardService, type MCardItem } from "@/services/MCardService";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ContentViewerProps {
  selectedCard: MCardItem | null;
  contentPreview: string | null;
  contentType: string;
  loading: boolean;
  formatTimestamp: (gTime: string | undefined) => string;
  uploadStatus: { success: boolean; message: string } | null;
  isDragging: boolean;
  onDragEnter: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export function ContentViewer({
  selectedCard,
  contentPreview,
  contentType,
  loading,
  formatTimestamp,
  uploadStatus,
  isDragging,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop
}: ContentViewerProps) {
  return (
    <div 
      className={`h-full w-full flex flex-col overflow-hidden ${isDragging ? 'ring-2 ring-primary' : ''}`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="p-4 bg-card border-b">
        <h2 className="text-lg font-medium">
          {selectedCard ? `Content: ${selectedCard.hash}` : 'Content Viewer'}
        </h2>
        {selectedCard && (
          <div className="flex justify-between items-center mt-1">
            <div className="text-sm text-muted-foreground">
              Type: {contentType}
            </div>
            <div className="text-sm text-muted-foreground">
              Created: {formatTimestamp(selectedCard.g_time)}
            </div>
          </div>
        )}
      
        {/* Upload status message */}
        {uploadStatus && (
          <div className={`mt-2 p-2 text-sm rounded ${uploadStatus.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {uploadStatus.message}
          </div>
        )}
      </div>
    
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full w-full" type="always">
          <div className="p-4 w-full h-full">
            {loading && <div className="text-center py-8">Loading content...</div>}
          
            {!loading && !selectedCard && (
              <div className="text-center py-16 text-muted-foreground">
                <p>Select a card from the left panel to view its content</p>
              </div>
            )}
          
            {!loading && selectedCard && contentPreview && (
              contentType.startsWith('text/') ? (
                <pre className="whitespace-pre-wrap bg-muted p-4 rounded-md overflow-auto w-full h-full">
                  {contentPreview}
                </pre>
              ) : contentType === 'application/pdf' ? (
                <div className="w-full h-full relative">
                  <div 
                    className="absolute inset-0"
                    dangerouslySetInnerHTML={{ __html: contentPreview as string }} 
                  />
                </div>
              ) : (
                <div 
                  className="w-full h-full overflow-auto"
                  dangerouslySetInnerHTML={{ __html: contentPreview as string }} 
                />
              )
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
