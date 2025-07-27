import React, { useRef, useState } from 'react';
import { type MCardItem } from "@/services/MCardService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";

enum SearchType {
  CONTENT = 'content',
  HASH = 'hash',
}

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
  formatTimestamp: (gTime: string | undefined) => string;
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
  handleFileInputChange,
  formatTimestamp
}: CardListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pageInput, setPageInput] = useState('');
  
  // Handle direct page navigation
  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageInput);
    if (pageNum && pageNum >= 1 && pageNum <= totalPages) {
      setPage(pageNum);
      setPageInput('');
    }
  };
  
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers
    if (/^\d*$/.test(value)) {
      setPageInput(value);
    }
  };
  
  return (
    <div className="flex h-full flex-col">
      <div className="p-4 bg-card border-b">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium">MCard Browser</h2>
            <div className="text-sm text-muted-foreground mt-1">{totalCards} cards in database</div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="flex items-center gap-1 border border-gray-400"
            onClick={handleOpenFileDialog}
          >
            <Upload size={14} />
            <span>Upload</span>
          </Button>
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".pdf,.txt,.md,.json,.jpg,.jpeg,.png,.gif"
          onChange={handleFileInputChange}
        />
        
        <Tabs defaultValue="content" className="mt-4" onValueChange={(value) => setSearchType(value === 'content' ? SearchType.CONTENT : SearchType.HASH)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="content">Content Search</TabsTrigger>
            <TabsTrigger value="hash">Hash Search</TabsTrigger>
          </TabsList>
        </Tabs>
      
        <form onSubmit={handleSearch} className="mt-3 flex gap-2">
          <Input
            type="text"
            placeholder="Search card content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow"
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {loading && (
            <div className="p-4 text-center">
              <div className="animate-pulse">Loading cards...</div>
            </div>
          )}
          
          {error && (
            <div className="p-4 text-center text-red-500">
              {error}
            </div>
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
      
      {/* Enhanced Pagination Controls */}
      <div className="p-3 border-t space-y-3">
        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(1)}
              disabled={page === 1 || loading}
              title="First page"
              className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <ChevronFirst size={14} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              title="Previous page"
              className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <ChevronLeft size={14} />
              Prev
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              title="Next page"
              className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Next
              <ChevronRight size={14} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages || loading}
              title="Last page"
              className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <ChevronLast size={14} />
            </Button>
          </div>
        </div>
        
        {/* Direct Page Navigation */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Go to page:</span>
            <form onSubmit={handlePageInputSubmit} className="flex items-center gap-2">
              <Input
                type="text"
                value={pageInput}
                onChange={handlePageInputChange}
                placeholder={`1-${totalPages}`}
                className="w-20 h-8 text-center text-sm"
                disabled={loading}
              />
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                disabled={!pageInput || loading}
                className="h-8 px-3 bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                Go
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export { SearchType };
