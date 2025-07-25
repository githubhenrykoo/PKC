import React, { useRef } from 'react';
import { type MCardItem } from "@/services/MCardService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload } from "lucide-react";

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
  );
}

export { SearchType };
