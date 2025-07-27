import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  return (
    <div className="space-y-3">
      <Tabs 
        defaultValue="content" 
        onValueChange={(value) => onSearchTypeChange(value === 'content' ? SearchType.CONTENT : SearchType.HASH)}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="content">Content Search</TabsTrigger>
          <TabsTrigger value="hash">Hash Search</TabsTrigger>
        </TabsList>
      </Tabs>
    
      <form onSubmit={onSearch} className="flex gap-2">
        <Input
          type="text"
          placeholder="Search card content..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="flex-grow"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>
    </div>
  );
}
