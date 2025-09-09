import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BottomNavigationProps {
  page: number;
  totalPages: number;
  totalCards: number;
  loading: boolean;
  onPageChange: (page: number | ((prevPage: number) => number)) => void;
}

export function BottomNavigation({ 
  page, 
  totalPages, 
  totalCards, 
  loading, 
  onPageChange 
}: BottomNavigationProps) {
  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-4 py-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange((p) => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
          className="flex items-center gap-1 border-border text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <ChevronLeft size={16} />
          Previous
        </Button>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {totalCards > 0 && (
            <span className="text-xs text-muted-foreground">
              ({totalCards} total cards)
            </span>
          )}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
          className="flex items-center gap-1 border-border text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          Next
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
