import React, { useState, useEffect, useRef } from 'react';
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
  const [envReady, setEnvReady] = useState(false);

  // Use a ref to store the MCardService instance once created
  const mCardServiceRef = useRef<MCardService | null>(null);
  
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

  // Wait for runtime environment variables to load before creating MCardService
  useEffect(() => {
    // Function to check if runtime env is loaded
    const checkRuntimeEnv = () => {
      if (window.RUNTIME_ENV) {
        console.log('Runtime environment detected, initializing MCardService');
        mCardServiceRef.current = new MCardService();
        setEnvReady(true);
        document.removeEventListener('runtime-env-loaded', checkRuntimeEnv);
      }
    };

    // If runtime env is already available, create service immediately
    if (window.RUNTIME_ENV) {
      console.log('Runtime environment already available, initializing MCardService');
      mCardServiceRef.current = new MCardService();
      setEnvReady(true);
    } else {
      // Otherwise wait for the runtime-env-loaded event
      console.log('Waiting for runtime environment to load...');
      document.addEventListener('runtime-env-loaded', checkRuntimeEnv);
      
      // Fall back to build-time environment after a timeout
      const timeoutId = setTimeout(() => {
        if (!mCardServiceRef.current) {
          console.warn('Runtime environment not loaded after timeout, falling back to build-time env');
          mCardServiceRef.current = new MCardService();
          setEnvReady(true);
        }
      }, 3000); // 3 second timeout
      
      return () => {
        document.removeEventListener('runtime-env-loaded', checkRuntimeEnv);
        clearTimeout(timeoutId);
      };
    }
  }, []);

  // Load cards when environment is ready and when page changes
  useEffect(() => {
    if (envReady) {
      fetchCards();
    }
  }, [envReady, page]);

  // Reset detail view when search query changes on mobile
  useEffect(() => {
    if (isMobile && searchQuery) {
      setShowDetail(false);
    }
  }, [searchQuery, isMobile]);

  // Function to fetch cards based on current state
  const fetchCards = async () => {
    // Skip if environment is not ready yet
    if (!envReady || !mCardServiceRef.current) {
      console.log('Environment not ready, skipping fetch cards');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let response;
      
      if (searchQuery) {
        if (searchType === SearchType.HASH) {
          response = await mCardServiceRef.current.searchByHash(searchQuery, page, 10);
        } else {
          response = await mCardServiceRef.current.searchCards(searchQuery, page, 10);
        }
      } else {
        response = await mCardServiceRef.current.listCards(page, 10);
      }
      
      setCards(response.items);
      setTotalPages(response.total_pages || Math.ceil(response.total_items / 10));
      
      // Update total card count
      const countResponse = await mCardServiceRef.current.getCardCount();
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
    if (envReady && mCardServiceRef.current) {
      fetchCards(); // Refresh the card list after successful upload
    }
  };
  
  // Handle text content upload (for both edit and direct text input)
  const handleUploadContent = async (content: string, contentType = 'text/plain') => {
    // Check if environment is ready
    if (!envReady || !mCardServiceRef.current) {
      setUploadStatus({
        success: false,
        message: 'Error: Service not initialized. Please wait or refresh the page.'
      });
      return;
    }
    
    try {
      setUploadStatus({
        success: false,
        message: 'Uploading content...'
      });
      
      // Create a Blob with the proper content type
      const contentBlob = new Blob([content], { type: contentType });
      
      // Use storeContent with the blob (which has content type information)
      const response = await mCardServiceRef.current.storeContent(contentBlob);
      
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
    // Check if environment is ready
    if (!envReady || !mCardServiceRef.current) {
      alert('Error: Service not initialized. Please wait or refresh the page.');
      return;
    }
    
    try {
      if (!hash) {
        console.error('No hash provided for deletion');
        return;
      }

      // Show confirmation modal
      const confirmDelete = window.confirm('Are you sure you want to delete this item? This action cannot be undone.');
      
      if (!confirmDelete) {
        return; // User cancelled
      }
      
      // Set loading state
      setLoading(true);
      
      // Perform deletion API call
      const response = await mCardServiceRef.current.deleteCard(hash);
      
      if (response.success) {      
        // Show success message
        setUploadStatus({
          success: true,
          message: `Card deleted successfully: ${hash.substring(0, 8)}...`
        });
        
        // Clear selected card if it was the one deleted
        if (selectedCard?.hash === hash) {
          clearSelection();
        }
        // Refresh the card list
        await fetchCards();
        
        // Clear message after 3 seconds
        setTimeout(() => setUploadStatus(null), 3000);
      } else {
        setUploadStatus({
          success: false,
          message: `Failed to delete card: ${hash.substring(0, 8)}...`
        });
      }
    } catch (error) {
      console.error('Error deleting card:', error);
      setUploadStatus({
        success: false,
        message: `Error deleting card: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading state when environment variables are not yet loaded
  if (!envReady || !mCardServiceRef.current) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Initializing MCard Browser...</p>
          <p className="text-sm text-gray-500 mt-2">Loading environment configuration</p>
        </div>
      </div>
    );
  }
  
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