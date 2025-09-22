import { useState, useRef } from 'react';
import { MCardService } from "@/services/MCardService";

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

/**
 * Custom hook for handling file uploads with MCard service
 * Includes 10MB file size limit validation
 */
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
    
    // Check for files exceeding size limit
    const validFiles: File[] = [];
    const oversizedFiles: string[] = [];
    
    Array.from(files).forEach(file => {
      if (file.size <= MAX_FILE_SIZE) {
        validFiles.push(file);
      } else {
        oversizedFiles.push(file.name);
      }
    });
    
    // Handle case where all files exceed size limit
    if (validFiles.length === 0) {
      setLoading(false);
      setUploadStatus({
        success: false,
        message: `Upload failed: File${oversizedFiles.length > 1 ? 's' : ''} exceed${oversizedFiles.length === 1 ? 's' : ''} the maximum size limit of 10MB.`
      });
      return;
    }
    
    // Handle case where some files exceed size limit
    const partialFailure = oversizedFiles.length > 0;
    
    try {
      const uploadPromises = validFiles.map(async (file) => {
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
      
      let successMessage = `${responses.length} file(s) uploaded successfully! Hashes: ${responses.map(r => r.hash).join(', ')}`;
      
      // Append warning about skipped oversized files if any
      if (partialFailure) {
        successMessage += `\n\nNote: ${oversizedFiles.length} file(s) exceeded the 10MB size limit and were not uploaded: ${oversizedFiles.join(', ')}`;
      }
      
      setUploadStatus({
        success: true,
        message: successMessage
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
