import React, { useState } from 'react';
import { uploadCard } from '@/services/mcard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toaster, toast } from 'sonner';

interface FileUploadProps {
  onUploadSuccess: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a file to upload.');
      return;
    }

    setIsLoading(true);
    toast.loading('Uploading file...');

    try {
      const response = await uploadCard(selectedFile);
      toast.success('File uploaded successfully!', {
        description: `Card created with hash: ${response.hash}`,
      });
      setSelectedFile(null); // Reset file input
      onUploadSuccess(); // Notify parent component
    } catch (error) {
      if (error instanceof Error) {
        toast.error('Upload failed', {
          description: error.message,
        });
      } else {
        toast.error('An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
      toast.dismiss(); // Dismiss the loading toast
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
      <Toaster />
      <h2 className="text-lg font-semibold">Upload New Card</h2>
      <div>
        <label htmlFor="file-upload" className="sr-only">
          Choose file
        </label>
        <Input id="file-upload" type="file" onChange={handleFileChange} />
      </div>
      {selectedFile && (
        <p className="text-sm text-muted-foreground">
          Selected file: {selectedFile.name}
        </p>
      )}
      <Button type="submit" disabled={isLoading || !selectedFile}>
        {isLoading ? 'Uploading...' : 'Upload'}
      </Button>
    </form>
  );
};

export default FileUpload;
