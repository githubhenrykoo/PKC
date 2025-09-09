import React from 'react';
import { type MCardItem } from "@/services/MCardService";
import { CardListHeader } from "./CardListHeader";
import { SearchSection, SearchType } from "./SearchSection";
import { CardGrid } from "./CardGrid";
import { PaginationControls } from "./PaginationControls";

interface CardListProps {
  cards: MCardItem[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalCards: number;
  searchQuery: string;
  searchType: SearchType;
  selectedCard: MCardItem | null;
  handleSelectCard: (card: MCardItem) => void;
  handleSearch: (e: React.FormEvent) => void;
  setSearchQuery: (query: string) => void;
  setSearchType: (type: SearchType) => void;
  setPage: (page: number | ((prevPage: number) => number)) => void;
  handleOpenFileDialog: () => void;
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CardList({
  cards,
  loading,
  error,
  page,
  totalPages,
  totalCards,
  searchQuery,
  searchType,
  selectedCard,
  handleSelectCard,
  handleSearch,
  setSearchQuery,
  setSearchType,
  setPage,
  handleOpenFileDialog,
  handleFileInputChange
}: CardListProps) {
  return (
    <div className="flex h-full flex-col">
      <CardListHeader
        totalCards={totalCards}
        onOpenFileDialog={handleOpenFileDialog}
        onFileInputChange={handleFileInputChange}
      />
      
      <div className="p-4 border-b">
        <SearchSection
          searchQuery={searchQuery}
          searchType={searchType}
          onSearchQueryChange={setSearchQuery}
          onSearchTypeChange={setSearchType}
          onSearch={handleSearch}
        />
      </div>
      
      <CardGrid
        cards={cards}
        loading={loading}
        error={error}
        selectedCard={selectedCard}
        searchQuery={searchQuery}
        onSelectCard={handleSelectCard}
      />
      
      <PaginationControls
        page={page}
        totalPages={totalPages}
        loading={loading}
        onPageChange={setPage}
      />
    </div>
  );
}

export { SearchType };
