import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type MCardItem as MCardItemType } from "@/services/MCardService";

interface MCardItemProps {
  card: MCardItemType;
  onViewContent?: (hash: string) => void;
}

export function MCardItem({ card, onViewContent }: MCardItemProps) {
  // Extract the first 5 chars of the hash
  const shortHash = card.hash.substring(0, 5);
  
  // Parse g_time to extract timestamp
  const gTimeParts = card.g_time?.split('|');
  const timestamp = gTimeParts && gTimeParts.length > 1 ? gTimeParts[1] : 'Unknown';
  
  // Format the date for display
  const formattedDate = timestamp !== 'Unknown' ? 
    new Date(timestamp).toLocaleString() : 'Unknown date';
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <Badge variant="outline">{shortHash}</Badge>
          <Badge>{card.content_type}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">
          Created: {formattedDate}
        </p>
      </CardContent>
      <CardFooter className="pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => onViewContent && onViewContent(card.hash)}
        >
          View Content
        </Button>
      </CardFooter>
    </Card>
  );
}
