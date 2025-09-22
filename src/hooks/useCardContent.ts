import { useState } from 'react';
import { MCardService, type MCardItem } from "@/services/MCardService";
import { ContentRenderer } from "@/components/mcard/ContentRenderer";

export function useCardContent() {
  const [selectedCard, setSelectedCard] = useState<MCardItem | null>(null);
  const [contentPreview, setContentPreview] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  const mCardService = new MCardService();
  
  const handleSelectCard = async (card: MCardItem) => {
    setSelectedCard(card);
    setLoading(true);
    
    try {
      // Get content type
      const contentTypeResponse = await mCardService.getCardContentType(card.hash);
      const cardContentType = contentTypeResponse.content_type;
      setContentType(cardContentType);
      
      // Get content
      const content = await mCardService.getCardContent(card.hash);
      
      // Use ContentRenderer to handle different content types
      const preview = await ContentRenderer({ card, content, contentType: cardContentType });
      setContentPreview(preview);
    } catch (err) {
      console.error('Error viewing content:', err);
      setContentPreview('Failed to load content. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const clearSelection = () => {
    setSelectedCard(null);
    setContentPreview(null);
    setContentType('');
  };
  
  return {
    selectedCard,
    contentPreview,
    contentType,
    loading,
    handleSelectCard,
    clearSelection
  };
}
