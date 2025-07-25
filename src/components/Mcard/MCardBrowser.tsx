import React, { useState, useEffect, useRef } from 'react';
import { MCardService, type MCardItem } from "@/services/MCardService";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { CardList, SearchType } from "./CardList";
import { ContentViewer } from "./ContentViewer";

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
  // Create ref for file input
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
          setContentPreview(`<div class="flex items-center justify-center w-full h-full overflow-auto">
            <img src="${url}" alt="Image preview" class="max-w-full object-contain" />
          </div>`);
        } else if (cardContentType.startsWith('text/')) {
          const text = await content.text();
          setContentPreview(text);
        } else if (cardContentType === 'application/pdf') {
          const url = URL.createObjectURL(content);
          setContentPreview(`
            <iframe 
              src="${url}" 
              style="width: 100%; height: 100%; min-height: 600px; border: none;"
              title="PDF Preview"
            ></iframe>
            <div style="position: absolute; bottom: 10px; right: 10px;">
              <a 
                href="${url}" 
                download="${card.hash}.pdf"
                class="inline-block bg-primary text-primary-foreground px-3 py-1 rounded-md"
              >
                Download PDF
              </a>
            </div>
          `);
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
    <>
      {/* Hidden file input for uploads */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.txt,.md,.json,.jpg,.jpeg,.png,.gif"
        onChange={handleFileInputChange}
      />
      
      <ResizablePanelGroup 
        direction="horizontal" 
        className="h-full w-full"
        onLayout={(sizes) => {
          // Optional: Save sizes to localStorage or state if needed
          console.log('Layout changed:', sizes);
        }}
      >
      {/* Left Panel - MCard List */}
      <ResizablePanel defaultSize={33} minSize={25} maxSize={50} className="h-full">
        <div className="h-full overflow-hidden">
          <CardList 
            cards={cards}
            loading={loading}
            error={error}
            page={page}
            totalPages={totalPages}
            totalCards={totalCards}
            searchQuery={searchQuery}
            searchType={searchType}
            selectedCard={selectedCard}
            handleSelectCard={handleSelectCard}
            handleSearch={handleSearch}
            setSearchQuery={setSearchQuery}
            setSearchType={setSearchType}
            setPage={setPage}
            handleOpenFileDialog={handleOpenFileDialog}
            handleFileInputChange={handleFileInputChange}
            formatTimestamp={formatTimestamp}
          />
        </div>
      </ResizablePanel>
    
      <ResizableHandle withHandle />
    
      {/* Right Panel - Content Display */}
      <ResizablePanel defaultSize={67} minSize={50} className="h-full">
        <div className="h-full overflow-hidden">
          <ContentViewer 
            selectedCard={selectedCard}
            contentPreview={contentPreview}
            contentType={contentType}
            loading={loading}
            formatTimestamp={formatTimestamp}
            uploadStatus={uploadStatus}
            isDragging={isDragging}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
    </>
  );
}
