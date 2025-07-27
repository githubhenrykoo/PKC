import React, { useState } from 'react';
import { MCardService, type MCardItem } from "@/services/MCardService";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  onDeleteCard?: (hash: string) => Promise<void>;
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
  onDrop,
  onDeleteCard
}: ContentViewerProps) {
  const [deleteLoading, setDeleteLoading] = useState(false);
  return (
    <div 
      className={`h-full w-full flex flex-col overflow-hidden ${isDragging ? 'ring-2 ring-primary' : ''}`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="p-4 bg-card border-b">
        <div className="flex justify-between items-start">
          <div className="flex-1">
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
          </div>
          {selectedCard && onDeleteCard && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  disabled={deleteLoading}
                  className="ml-4"
                >
                  <Trash2 size={14} className="mr-1" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Card</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this card? This action cannot be undone.
                    <br /><br />
                    <strong>Hash:</strong> {selectedCard.hash.substring(0, 12)}...
                    <br />
                    <strong>Type:</strong> {contentType}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      setDeleteLoading(true);
                      try {
                        await onDeleteCard(selectedCard.hash);
                      } finally {
                        setDeleteLoading(false);
                      }
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      
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
