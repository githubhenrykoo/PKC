import React, { useState, useEffect } from 'react';
import { MCardService, type MCardItem } from "@/services/MCardService";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { CardList } from "./CardList";
import { SearchType } from "./SearchSection";
import { ContentViewer } from "./ContentViewer";
import { BottomNavigation } from "./BottomNavigation";
import { useCardContent } from "@/hooks/useCardContent";
import { useFileUpload } from "@/hooks/useFileUpload";

export function MCardBrowser() {
  const [cards, setCards] = useState<MCardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>(SearchType.CONTENT);
  const [totalCards, setTotalCards] = useState(0);

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
  
  // Handle file upload callback for the hook
  const handleFileUploadCallback = () => {
    fetchCards(); // Refresh the card list after successful upload
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

  return (
    <>
      {/* Hidden file input for uploads */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
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
            uploadStatus={uploadStatus}
            isDragging={isDragging}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDeleteCard={handleDeleteCard}
          />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
    
    {/* Bottom Navigation Controls */}
    <BottomNavigation 
      page={page}
      totalPages={totalPages}
      totalCards={totalCards}
      loading={loading}
      onPageChange={setPage}
    />
    </>
  );
}
