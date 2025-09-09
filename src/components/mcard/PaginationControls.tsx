import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number | ((prevPage: number) => number)) => void;
}

export function PaginationControls({ page, totalPages, loading, onPageChange }: PaginationControlsProps) {
  const [pageInput, setPageInput] = useState('');
  
  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageInput);
    if (pageNum && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
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
    <div className="p-3 border-t space-y-3">
      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={page === 1 || loading}
            title="First page"
            className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronFirst size={14} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange((p) => Math.max(1, p - 1))}
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
            onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
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
            onClick={() => onPageChange(totalPages)}
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
  );
}
