import React, { useState, useEffect } from 'react';
import { MCardService, type MCardItem } from "@/services/MCardService";
import { MCardItem as MCardItemComponent } from "./MCardItem";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  // Handle view content
  const handleViewContent = async (hash: string) => {
    try {
      // Get content type
      const contentTypeResponse = await mCardService.getCardContentType(hash);
      const contentType = contentTypeResponse.content_type;
      
      // Open content in new tab based on content type
      const content = await mCardService.getCardContent(hash);
      
      // Create object URL for blob content
      if (content instanceof Blob) {
        const url = URL.createObjectURL(content);
        window.open(url, '_blank');
      } else if (typeof content === 'string') {
        // Create a text blob and open
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('Error viewing content:', err);
      alert('Failed to view content. Please try again.');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>MCard Browser</CardTitle>
        <div className="text-sm text-muted-foreground">
          {totalCards} cards in database
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={SearchType.CONTENT} className="mb-6">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger 
              value={SearchType.CONTENT}
              onClick={() => setSearchType(SearchType.CONTENT)}
            >
              Content Search
            </TabsTrigger>
            <TabsTrigger 
              value={SearchType.HASH}
              onClick={() => setSearchType(SearchType.HASH)}
            >
              Hash Search
            </TabsTrigger>
          </TabsList>
          <TabsContent value={SearchType.CONTENT} className="mt-4">
            <form onSubmit={handleSearch} className="flex space-x-2">
              <Input
                placeholder="Search card content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit">Search</Button>
            </form>
          </TabsContent>
          <TabsContent value={SearchType.HASH} className="mt-4">
            <form onSubmit={handleSearch} className="flex space-x-2">
              <Input
                placeholder="Enter partial hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit">Find</Button>
            </form>
          </TabsContent>
        </Tabs>

        {loading && <div className="py-8 text-center">Loading...</div>}
        
        {error && (
          <div className="py-4 text-center text-red-500">{error}</div>
        )}
        
        {!loading && !error && cards.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            No cards found. {searchQuery ? 'Try a different search term.' : ''}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {cards.map((card) => (
            <MCardItemComponent 
              key={card.hash} 
              card={card} 
              onViewContent={handleViewContent}
            />
          ))}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
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
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= totalPages || loading}
        >
          Next
        </Button>
      </CardFooter>
    </Card>
  );
}
