import React, { useState, useEffect, useRef } from 'react';
import { MCardService, type MCardItem } from "@/services/MCardService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Upload, Plus } from "lucide-react";

enum SearchType {
  CONTENT = 'content',
  HASH = 'hash',
}

export function MCardBrowser() {
  const [cards, setCards] = useState<MCardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>(SearchType.CONTENT);
  const [totalCards, setTotalCards] = useState(0);
  const [selectedCard, setSelectedCard] = useState<MCardItem | null>(null);
  const [contentPreview, setContentPreview] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mCardService = new MCardService();

  // Load cards on initial mount and when page changes
  useEffect(() => {
    fetchCards();
  }, [page]);

  // Function to fetch cards based on current state
  const fetchCards = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let response;
      
      if (searchQuery) {
        if (searchType === SearchType.HASH) {
          response = await mCardService.searchByHash(searchQuery, page, 10);
        } else {
          response = await mCardService.searchCards(searchQuery, page, 10);
        }
      } else {
        response = await mCardService.listCards(page, 10);
      }
      
      setCards(response.items);
      setTotalPages(response.total_pages || Math.ceil(response.total_items / 10));
      
      // Update total card count
      const countResponse = await mCardService.getCardCount();
      setTotalCards(countResponse.count);
    } catch (err) {
      setError('Failed to fetch cards. Please try again.');
      console.error('Error fetching cards:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page when searching
    fetchCards();
  };

  // Handle selecting a card to view content
  const handleSelectCard = async (card: MCardItem) => {
    setSelectedCard(card);
    setLoading(true);
    
    try {
      // Get content type
      const contentTypeResponse = await mCardService.getCardContentType(card.hash);
      const cardContentType = contentTypeResponse.content_type;
      setContentType(cardContentType);
      
      // Get content
      const content = await mCardService.getCardContent(card.hash);
      
      // Handle different content types
      if (content instanceof Blob) {
        if (cardContentType.startsWith('image/')) {
          const url = URL.createObjectURL(content);
          setContentPreview(`<img src="${url}" alt="Image preview" class="max-w-full h-auto" />`);
        } else if (cardContentType.startsWith('text/')) {
          const text = await content.text();
          setContentPreview(text);
        } else if (cardContentType === 'application/pdf') {
          const url = URL.createObjectURL(content);
          setContentPreview(`<div class="w-full h-[500px]">
            <iframe 
              src="${url}" 
              class="w-full h-full border-0" 
              title="PDF Preview"
            ></iframe>
            <div class="mt-2 text-right">
              <a 
                href="${url}" 
                download="${card.hash}.pdf"
                class="inline-block bg-primary text-primary-foreground px-3 py-1 rounded-md"
              >
                Download PDF
              </a>
            </div>
          </div>`);
        } else {
          setContentPreview(`<div class="p-4 bg-muted rounded-md">
            <p>Binary content (${cardContentType})</p>
            <button class="mt-2 bg-primary text-primary-foreground px-3 py-1 rounded-md" 
              onclick="window.open('${URL.createObjectURL(content)}', '_blank')">
              Download
            </button>
          </div>`);
        }
      } else if (typeof content === 'string') {
        setContentPreview(content);
      }
    } catch (err) {
      console.error('Error viewing content:', err);
      setContentPreview('Failed to load content. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setLoading(true);
    setUploadStatus(null);
    
    try {
      const file = files[0]; // Just handle one file for now
      console.log('File to upload:', { 
        name: file.name, 
        type: file.type, 
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString()
      });
      
      const metadata = { filename: file.name };
      console.log('Uploading with metadata:', metadata);
      
      // Wrap in try-catch to get more detailed error info
      try {
        const response = await mCardService.uploadFile(file, metadata);
        console.log('Upload response:', response);
        
        setUploadStatus({
          success: true,
          message: `File uploaded successfully! Hash: ${response.hash}`
        });
        
        // Refresh the card list
        fetchCards();
      } catch (apiError) {
        console.error('API error details:', apiError);
        throw apiError; // Re-throw for outer catch
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      let errorMsg = 'Failed to upload file. Please try again.';
      
      // Get more specific error message if available
      if (err instanceof Error) {
        errorMsg = `Upload failed: ${err.message}`;
      }
      
      setUploadStatus({
        success: false,
        message: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  };
  
  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    handleFileUpload(files);
  };
  
  // Open file dialog
  const handleOpenFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Format timestamp for display
  const formatTimestamp = (gTime: string | undefined): string => {
    if (!gTime) return 'Unknown';
    
    const parts = gTime.split('|');
    if (parts.length < 2) return 'Unknown';
    
    try {
      return new Date(parts[1]).toLocaleString();
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <div className="flex h-[80vh] gap-4">
      {/* Left Panel - Navigation/File List */}
      <div className="w-1/3 flex flex-col border rounded-lg shadow-sm">
        <div className="p-4 bg-card border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium">MCard Browser</h2>
              <div className="text-sm text-muted-foreground mt-1">
                {totalCards} cards in database
              </div>
            </div>
            <Button 
              onClick={handleOpenFileDialog}
              variant="secondary"
              size="sm"
              className="flex items-center gap-1 border border-gray-400"
            >
              <Upload size={14} />
              <span>Upload</span>
            </Button>
          </div>
          
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            className="hidden"
            accept=".pdf,.txt,.md,.json,.jpg,.jpeg,.png,.gif"
          />
          
          <Tabs defaultValue={SearchType.CONTENT} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value={SearchType.CONTENT}
                onClick={() => setSearchType(SearchType.CONTENT)}
                className="focus:outline-none focus-visible:ring-1 focus-visible:ring-primary" 
                data-prevent-theme-change="true"
              >
                Content Search
              </TabsTrigger>
              <TabsTrigger 
                value={SearchType.HASH}
                onClick={() => setSearchType(SearchType.HASH)}
                className="focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                data-prevent-theme-change="true"
              >
                Hash Search
              </TabsTrigger>
            </TabsList>
            <TabsContent value={SearchType.CONTENT} className="mt-2">
              <form onSubmit={handleSearch} className="flex space-x-2">
                <Input
                  placeholder="Search card content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  data-prevent-theme-change="true"
                />
                <Button type="submit" size="sm">Search</Button>
              </form>
            </TabsContent>
            <TabsContent value={SearchType.HASH} className="mt-2">
              <form onSubmit={handleSearch} className="flex space-x-2">
                <Input
                  placeholder="Enter partial hash..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  data-prevent-theme-change="true"
                />
                <Button type="submit" size="sm">Find</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            {loading && <div className="p-4 text-center">Loading...</div>}
            
            {error && (
              <div className="p-4 text-center text-red-500">{error}</div>
            )}
            
            {!loading && !error && cards.length === 0 && (
              <div className="p-4 text-center text-muted-foreground">
                No cards found. {searchQuery ? 'Try a different search term.' : ''}
              </div>
            )}
            
            <div className="p-2">
              {cards.map((card) => (
                <div 
                  key={card.hash} 
                  className={`p-2 mb-1 rounded-md cursor-pointer hover:bg-accent transition-colors ${selectedCard?.hash === card.hash ? 'bg-accent/50' : ''}`}
                  onClick={() => handleSelectCard(card)}
                >
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="mb-1">{card.hash.substring(0, 5)}</Badge>
                    <Badge className="text-xs">{card.content_type}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Created: {formatTimestamp(card.g_time)}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        
        <div className="p-3 border-t flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            Previous
          </Button>
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages || loading}
          >
            Next
          </Button>
        </div>
      </div>
      
      {/* Right Panel - Content Display */}
      <div 
        className={`flex-1 border rounded-lg shadow-sm flex flex-col ${isDragging ? 'ring-2 ring-primary' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-4 bg-card border-b">
          <h2 className="text-lg font-medium">
            {selectedCard ? `Content: ${selectedCard.hash.substring(0, 8)}...` : 'Content Viewer'}
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
          <ScrollArea className="h-full">
            <div className="p-4">
              {loading && <div className="text-center py-8">Loading content...</div>}
              
              {!loading && !selectedCard && (
                <div className="text-center py-16 text-muted-foreground">
                  <p>Select a card from the left panel to view its content</p>
                </div>
              )}
              
              {!loading && selectedCard && contentPreview && (
                contentType.startsWith('text/') ? (
                  <pre className="whitespace-pre-wrap bg-muted p-4 rounded-md overflow-x-auto">
                    {contentPreview}
                  </pre>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: contentPreview }} />
                )
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
