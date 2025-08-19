import React, { useState, useEffect } from 'react';
import { MCardService, type MCardItem } from "@/services/MCardService";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, Save, FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/MVPCard/card.tsx";
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
  uploadStatus: { success: boolean; message: string } | null;
  isDragging: boolean;
  onDragEnter: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDeleteCard?: (hash: string) => Promise<void>;
  onUploadContent?: (content: string, contentType?: string) => Promise<void>;
}

export function ContentViewer({
  selectedCard,
  contentPreview,
  contentType,
  loading,
  uploadStatus,
  isDragging,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onDeleteCard,
  onUploadContent
}: ContentViewerProps) {
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState<string>('');
  const [isTypingMode, setIsTypingMode] = useState(false);
  const [newContent, setNewContent] = useState<string>('');
  
  // Check if content is text or markdown for edit capability
  const isTextContent = contentType.startsWith('text/') || contentType.includes('markdown');
  
  // Update edited content when selectedCard changes
  useEffect(() => {
    if (contentPreview) {
      // Clean content for editing (remove HTML tags and download section)
      const cleanedContent = contentPreview
        .replace(/<[^>]*>/g, '')
        .replace(/Content Type:.*?Download/s, '')
        .trim();
      setEditedContent(cleanedContent);
    }
  }, [contentPreview]);
  
  // Handle saving edited content
  const handleSaveEdit = async () => {
    if (onUploadContent && editedContent) {
      await onUploadContent(editedContent, contentType);
      setEditMode(false);
    }
  };
  
  // Handle uploading new typed content
  const handleUploadTypedContent = async () => {
    if (onUploadContent && newContent) {
      await onUploadContent(newContent, 'text/plain');
      setNewContent('');
      setIsTypingMode(false);
    }
  };
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
                  g_time: {selectedCard.g_time || 'Unknown'}
                </div>
              </div>
            )}
          </div>
          {isTextContent && selectedCard && !editMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditMode(true)}
              className="ml-2"
            >
              <Edit size={14} className="mr-1" />
              Edit
            </Button>
          )}
          
          {editMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveEdit}
              className="ml-2"
            >
              <Save size={14} className="mr-1" />
              Save as New
            </Button>
          )}
          
          {!selectedCard && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsTypingMode(!isTypingMode)}
              className="ml-2 border border-gray-300 dark:border-gray-700"
            >
              <FileText size={14} className="mr-1" />
              {isTypingMode ? 'File Upload' : 'Text Input'}
            </Button>
          )}
          
          {selectedCard && onDeleteCard && !editMode && (
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
    
      <div className="flex-1 overflow-hidden flex flex-col">
        <ScrollArea className="flex-grow h-full w-full" type="always">
          <div className="p-4 w-full h-full min-h-[calc(100vh-200px)]">
            {loading && <div className="text-center py-8">Loading content...</div>}
          
            {!loading && !selectedCard && (
              <div className="text-center py-16 text-muted-foreground">
                <p>Select a card from the left panel to view its content</p>
              </div>
            )}
          
            {/* Text input mode when no card is selected */}
            {!loading && !selectedCard && isTypingMode && (
              <Card className="mb-4 p-4">
                <h3 className="text-lg font-medium mb-2">Enter Text Content</h3>
                <Textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Type or paste your content here..."
                  className="min-h-[200px] mb-4"
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsTypingMode(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUploadTypedContent}
                    disabled={!newContent.trim()}
                  >
                    <Save size={16} className="mr-2" />
                    Upload Content
                  </Button>
                </div>
              </Card>
            )}
            
            {/* Edit mode for text content */}
            {!loading && selectedCard && editMode && (
              <Card className="mb-4 p-4 w-full">
                <h3 className="text-lg font-medium mb-2">Edit Content</h3>
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[400px] mb-4"
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setEditMode(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveEdit}
                    disabled={!editedContent.trim()}
                  >
                    <Save size={16} className="mr-2" />
                    Save as New Card
                  </Button>
                </div>
              </Card>
            )}
            
            {/* Normal content display (not in edit mode) */}
            {!loading && selectedCard && contentPreview && !editMode && (
              contentType.startsWith('text/') || contentType.includes('markdown') ? (
                <div className="w-full h-full relative" style={{ minHeight: 'calc(100vh - 200px)' }}>
                  <iframe 
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta charset="UTF-8">
                          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                          <style>
                            html, body { 
                              height: 100%;
                              margin: 0;
                              padding: 0;
                              overflow: auto;
                            }
                            body { 
                              font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
                              margin: 0; 
                              padding: 16px; 
                              background: #f9fafb;
                              color: #374151;
                              white-space: pre-wrap;
                              word-wrap: break-word;
                              font-size: 14px;
                              line-height: 1.5;
                              min-height: calc(100vh - 32px); /* Full height minus padding */
                              box-sizing: border-box;
                            }
                            .download-btn {
                              position: fixed;
                              top: 10px;
                              right: 10px;
                              background: #3b82f6;
                              color: white;
                              padding: 6px 12px;
                              border-radius: 4px;
                              text-decoration: none;
                              font-size: 12px;
                              z-index: 1000;
                            }
                            .content-container {
                              min-height: calc(100% - 40px);
                            }
                          </style>
                        </head>
                        <body>
                          <a href="${selectedCard ? URL.createObjectURL(new Blob([contentPreview.replace(/<[^>]*>/g, '').replace(/Content Type:.*?Download/s, '').trim()], {type: contentType})) : '#'}" download="${selectedCard?.hash}" class="download-btn">Download</a>
                          <div class="content-container">
                            ${contentPreview.replace(/<[^>]*>/g, '').replace(/Content Type:.*?Download/s, '').trim()}
                          </div>
                        </body>
                      </html>
                    `}
                    className="w-full h-full border-0"
                    style={{ minHeight: 'calc(100vh - 200px)', height: '100%' }}
                    title="Content Preview"
                    sandbox="allow-downloads"
                  />
                </div>
              ) : contentType === 'application/pdf' ? (
                <div className="w-full h-full relative" style={{ minHeight: 'calc(100vh - 200px)' }}>
                  <div 
                    className="absolute inset-0"
                    dangerouslySetInnerHTML={{ __html: contentPreview as string }} 
                  />
                </div>
              ) : (
                <div 
                  className="w-full h-full overflow-auto" 
                  style={{ minHeight: 'calc(100vh - 200px)' }}
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
