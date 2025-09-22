import React from 'react';
import { type MCardItem } from "@/services/MCardService";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CardItem } from "./CardItem";

interface CardGridProps {
  cards: MCardItem[];
  loading: boolean;
  error: string | null;
  selectedCard: MCardItem | null;
  searchQuery: string;
  onSelectCard: (card: MCardItem) => void;
}

export function CardGrid({ 
  cards, 
  loading, 
  error, 
  selectedCard, 
  searchQuery, 
  onSelectCard, 

}: CardGridProps) {
  return (
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
            <CardItem
              key={card.hash}
              card={card}
              isSelected={selectedCard?.hash === card.hash}
              onClick={onSelectCard}

            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
