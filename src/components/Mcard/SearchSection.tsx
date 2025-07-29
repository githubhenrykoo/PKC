import React, { useEffect, useState, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, RefreshCw } from "lucide-react";

export enum SearchType {
  CONTENT = 'content',
  HASH = 'hash',
}

interface SearchSectionProps {
  searchQuery: string;
  searchType: SearchType;
  onSearchQueryChange: (query: string) => void;
  onSearchTypeChange: (type: SearchType) => void;
  onSearch: (e: React.FormEvent) => void;
}

export function SearchSection({
  searchQuery,
  searchType,
  onSearchQueryChange,
  onSearchTypeChange,
  onSearch
}: SearchSectionProps) {
  // Create a reference to store the timeout ID for debounce
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Track if search query is 3+ characters
  const [canAutoSearch, setCanAutoSearch] = useState(searchQuery.length >= 3);
  
  // Handle search query changes with debounce
  const handleSearchInputChange = (value: string) => {
    // Update the search query in parent component immediately
    onSearchQueryChange(value);
    
    // Update auto-search eligibility
    setCanAutoSearch(value.length >= 3);
    
    // Clear any existing timeout
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Only set up auto-search if query is 3+ characters
    if (value.length >= 3) {
      // Create new timeout with 500ms delay
      debounceTimerRef.current = setTimeout(() => {
        // Trigger search
        console.log(`Auto-searching for: ${value}`);
        onSearch(new Event('submit') as any);
      }, 500); // 0.5 second debounce delay
    }
  };
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      <Tabs 
        defaultValue="content" 
        onValueChange={(value) => onSearchTypeChange(value === 'content' ? SearchType.CONTENT : SearchType.HASH)}
      >
        <TabsList className="grid w-full grid-cols-2 gap-2 bg-transparent p-0">
          <TabsTrigger 
            value="content"
            className="data-[state=active]:bg-white data-[state=active]:text-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:text-white transition-colors"
          >
            Content Search
          </TabsTrigger>
          <TabsTrigger 
            value="hash"
            className="data-[state=active]:bg-white data-[state=active]:text-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:text-white transition-colors"
          >
            Hash Search
          </TabsTrigger>
        </TabsList>
      </Tabs>
    
      <form onSubmit={(e) => {
        e.preventDefault();
        onSearch(e);
      }} className="flex gap-2">
        <Input
          type="text"
          placeholder={searchType === SearchType.CONTENT 
            ? "Search card content..." 
            : "Search by hash..."}
          value={searchQuery}
          onChange={(e) => handleSearchInputChange(e.target.value)}
          className="flex-grow"
        />
        <div className="flex gap-1">
          <Button 
            type="submit" 
            variant="default"
            size="sm"
            className="px-3 flex items-center"
            title="Search"
          >
            <Search size={16} className="mr-1" />
            Search
          </Button>
          <Button 
            type="button" 
            variant="outline"
            size="sm"
            className="px-2" 
            onClick={() => {
              // Force refresh by triggering search with current query
              onSearch(new Event('submit') as any);
            }}
            title="Reload results"
          >
            <RefreshCw size={16} />
          </Button>
        </div>
      </form>
    </div>
  );
}
