import React, { useState, useEffect, useCallback } from 'react';
import { MCardService, type MCardItem, type MCardListResponse } from '@/services/MCardService';
import FileUpload from './FileUpload'; // Assuming FileUpload is in the same directory
import { CardList, SearchType } from './CardList';

const mcardService = new MCardService();

const MCardManager: React.FC = () => {
  const [cards, setCards] = useState<MCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCards, setTotalCards] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>(SearchType.CONTENT);
  const [selectedCard, setSelectedCard] = useState<MCardItem | null>(null);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let response: MCardListResponse;
      if (searchType === SearchType.HASH) {
        response = await mcardService.searchByHash(searchQuery, page);
      } else {
        response = await mcardService.listCards(page, 10, searchQuery);
      }
      setCards(response.items);
      setTotalPages(response.total_pages || 1);
      setTotalCards(response.total_items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, searchType]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCards();
  };

  const handleUploadSuccess = () => {
    // Refresh the card list after a successful upload
    fetchCards();
  };

  // Dummy handlers for props required by CardList
  const handleOpenFileDialog = () => {};
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {};

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4">
        <FileUpload onUploadSuccess={handleUploadSuccess} />
      </div>
      <div className="flex-grow">
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
          handleSelectCard={setSelectedCard}
          handleSearch={handleSearch}
          setSearchQuery={setSearchQuery}
          setSearchType={setSearchType}
          setPage={setPage}
          handleOpenFileDialog={handleOpenFileDialog}
          handleFileInputChange={handleFileInputChange}
        />
      </div>
    </div>
  );
};

export default MCardManager;
