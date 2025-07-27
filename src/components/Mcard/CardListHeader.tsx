import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface CardListHeaderProps {
  totalCards: number;
  onOpenFileDialog: () => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CardListHeader({ totalCards, onOpenFileDialog, onFileInputChange }: CardListHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
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
        onChange={onFileInputChange}
      />
    </div>
  );
}
