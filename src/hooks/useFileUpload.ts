import { useState, useRef } from 'react';
import { MCardService } from "@/services/MCardService";

export function useFileUpload() {
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const mCardService = new MCardService();
  
  const handleFileUpload = async (files: FileList | null, onSuccess?: () => void) => {
    if (!files || files.length === 0) return;
    
    setLoading(true);
    setUploadStatus(null);
    
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        console.log('File to upload:', { 
          name: file.name, 
          type: file.type || 'application/octet-stream',
          size: file.size,
          lastModified: new Date(file.lastModified).toISOString()
        });
        
        const metadata = { 
          filename: file.name,
          originalType: file.type || 'application/octet-stream',
          size: file.size
        };
        
        const response = await mCardService.uploadFile(file, metadata);
        return response;
      });
      
      const responses = await Promise.all(uploadPromises);
      
      setUploadStatus({
        success: true,
        message: `${responses.length} file(s) uploaded successfully! Hashes: ${responses.map(r => r.hash).join(', ')}`
      });
      
      onSuccess?.();
    } catch (err) {
      console.error('Error uploading file:', err);
      let errorMsg = 'Failed to upload file(s). Please try again.';
      
      if (err instanceof Error) {
        errorMsg = `Upload failed: ${err.message}`;
      }
      
      setUploadStatus({
        success: false,
        message: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent, onSuccess?: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    handleFileUpload(files, onSuccess);
  };
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>, onSuccess?: () => void) => {
    const files = e.target.files;
    handleFileUpload(files, onSuccess);
  };
  
  const handleOpenFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  return {
    loading,
    uploadStatus,
    isDragging,
    fileInputRef,
    handleFileUpload,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileInputChange,
    handleOpenFileDialog,
    setUploadStatus
  };
}
