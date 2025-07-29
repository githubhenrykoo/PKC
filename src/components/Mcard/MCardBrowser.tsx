import React, { useState, useEffect } from 'react';
import { MCardService, type MCardItem } from "@/services/MCardService";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { CardList } from "./CardList";
import { SearchType } from "./SearchSection";
import { ContentViewer } from "./ContentViewer";
import { useCardContent } from "@/hooks/useCardContent";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function MCardBrowser() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [cards, setCards] = useState<MCardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>(SearchType.CONTENT);
  const [totalCards, setTotalCards] = useState(0);
  const [showDetail, setShowDetail] = useState(false);

  const mCardService = new MCardService();
  
  // Use custom hooks for content and file upload
  const {
    selectedCard,
    contentPreview,
    contentType,
    loading: contentLoading,
    handleSelectCard,
    clearSelection
  } = useCardContent();
  
  const {
    loading: uploadLoading,
    uploadStatus,
    isDragging,
    fileInputRef,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileInputChange,
    handleOpenFileDialog,
    setUploadStatus
  } = useFileUpload();

  // Load cards on initial mount and when page changes
  useEffect(() => {
    fetchCards();
  }, [page]);

  // Reset detail view when search query changes on mobile
  useEffect(() => {
    if (isMobile && searchQuery) {
      setShowDetail(false);
    }
  }, [searchQuery, isMobile]);

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
    setPage(1);
    fetchCards();
  };

  const handleCardSelect = (card: MCardItem) => {
    handleSelectCard(card);
    if (isMobile) setShowDetail(true);
  };

  const handleBackToList = () => {
    setShowDetail(false);
    clearSelection();
  };
  
  // Handle file upload callback for the hook
  const handleFileUploadCallback = () => {
    fetchCards(); // Refresh the card list after successful upload
  };
  
  // Handle text content upload (for both edit and direct text input)
  const handleUploadContent = async (content: string, contentType = 'text/plain') => {
    try {
      setUploadStatus({
        success: false,
        message: 'Uploading content...'
      });
      
      // Create a Blob with the proper content type
      const contentBlob = new Blob([content], { type: contentType });
      
      // Use storeContent with the blob (which has content type information)
      const response = await mCardService.storeContent(contentBlob);
      
      if (response && response.hash) {
        // Refresh the card list
        await fetchCards();
        
        // Show success message
        setUploadStatus({
          success: true,
          message: `Content uploaded successfully: ${response.hash.substring(0, 8)}...`
        });
        
        // Select the newly created card
        handleSelectCard({
          hash: response.hash,
          content_type: response.content_type,
          g_time: response.g_time
        });
        
        // Clear message after 3 seconds
        setTimeout(() => setUploadStatus(null), 3000);
      } else {
        throw new Error('Failed to upload content');
      }
    } catch (err) {
      console.error('Error uploading content:', err);
      setUploadStatus({
        success: false,
        message: `Failed to upload content: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
      
      // Clear error message after 5 seconds
      setTimeout(() => setUploadStatus(null), 5000);
    }
  };
  
  // Handle card deletion
  const handleDeleteCard = async (hash: string) => {
    try {
      const response = await mCardService.deleteCard(hash);
      
      if (response.success) {
        // Clear selected card if it was the one deleted
        if (selectedCard?.hash === hash) {
          clearSelection();
        }
        
        // Refresh the card list
        await fetchCards();
        
        // Show success message
        setUploadStatus({
          success: true,
          message: `Card deleted successfully: ${hash.substring(0, 8)}...`
        });
        
        // Clear message after 3 seconds
        setTimeout(() => setUploadStatus(null), 3000);
      } else {
        throw new Error(response.message || 'Failed to delete card');
      }
    } catch (err) {
      console.error('Error deleting card:', err);
      setUploadStatus({
        success: false,
        message: `Failed to delete card: ${err instanceof Error ? err.message : 'Unknown error'}`
      });
      
      // Clear error message after 5 seconds
      setTimeout(() => setUploadStatus(null), 5000);
    }
  };

  // Mobile view - Show either list or detail
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          onChange={handleFileInputChange}
        />

        {showDetail ? (
          <div className="flex-1 flex flex-col">
            <div className="p-2 border-b flex items-center">
              <Button variant="ghost" size="sm" onClick={handleBackToList}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to List
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              <ContentViewer 
                selectedCard={selectedCard}
                contentPreview={contentPreview}
                contentType={contentType}
                loading={loading}
                uploadStatus={uploadStatus}
                isDragging={isDragging}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDeleteCard={handleDeleteCard}
                onUploadContent={handleUploadContent}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
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
              handleSelectCard={handleCardSelect}
              handleSearch={handleSearch}
              setSearchQuery={setSearchQuery}
              setSearchType={setSearchType}
              setPage={setPage}
              handleOpenFileDialog={handleOpenFileDialog}
              handleFileInputChange={handleFileInputChange}
            />
          </div>
        )}


      </div>
    );
  }

  // Desktop view - Show both panels
  return (
    <div className="flex flex-col h-full">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={handleFileInputChange}
      />
      
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={33} minSize={25} maxSize={50}>
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
            />
          </div>
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        <ResizablePanel defaultSize={67} minSize={50}>
          <div className="h-full overflow-hidden">
            <ContentViewer 
              selectedCard={selectedCard}
              contentPreview={contentPreview}
              contentType={contentType}
              loading={loading}
              uploadStatus={uploadStatus}
              isDragging={isDragging}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDeleteCard={handleDeleteCard}
              onUploadContent={handleUploadContent}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
      

    </div>
  );
}