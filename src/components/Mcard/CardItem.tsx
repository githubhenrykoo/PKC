import React from 'react';
import { type MCardItem } from "@/services/MCardService";
import { Badge } from "@/components/ui/badge";

interface CardItemProps {
  card: MCardItem;
  isSelected: boolean;
  onClick: (card: MCardItem) => void;
  formatTimestamp: (gTime: string | undefined) => string;
}

export function CardItem({ card, isSelected, onClick, formatTimestamp }: CardItemProps) {
  return (
    <div 
      className={`p-2 mb-1 rounded-md cursor-pointer hover:bg-accent transition-colors ${
        isSelected ? 'bg-accent/50' : ''
      }`}
      onClick={() => onClick(card)}
    >
      <div className="flex justify-between items-center">
        <Badge variant="outline" className="mb-1">
          {card.hash.length > 6 
            ? `${card.hash.substring(0, 3)}...${card.hash.slice(-3)}` 
            : card.hash
          }
        </Badge>
        <Badge className="text-xs min-w-[120px] text-center">{card.content_type}</Badge>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        Created: {formatTimestamp(card.g_time)}
      </div>
    </div>
  );
}
