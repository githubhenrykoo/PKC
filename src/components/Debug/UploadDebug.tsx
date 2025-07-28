import React, { useRef, useState } from 'react';
import MCardService from '../../services/MCardService';

/**
 * Debug component to test file uploads with detailed logging
 */
export default function UploadDebug() {
  const [log, setLog] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const addToLog = (message: string) => {
    setLog(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      addToLog(`File selected: ${selectedFile.name} (${selectedFile.type || 'unknown'}, ${(selectedFile.size / 1024).toFixed(2)}KB)`);
    }
  };
  
  const uploadWithFetch = async () => {
    if (!file) {
      addToLog('No file selected');
      return;
    }
    
    addToLog(`Starting direct fetch upload for ${file.name}...`);
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add metadata
      const metadata = {
        filename: file.name,
        originalType: file.type || 'application/octet-stream',
        size: file.size
      };
      formData.append('metadata', JSON.stringify(metadata));
      
      // Log FormData entries
      addToLog('FormData entries:');
      for (const pair of formData.entries()) {
        if (pair[0] === 'file') {
          const fileObj = pair[1] as File;
          addToLog(`- ${pair[0]}: File(${fileObj.name}, ${fileObj.type || 'unknown'}, ${(fileObj.size / 1024).toFixed(2)}KB)`);
        } else {
          addToLog(`- ${pair[0]}: ${pair[1]}`);
        }
      }
      
      // Make direct fetch call with detailed logging
      const apiUrl = 'https://devmcard.pkc.pub/v1/files';
      addToLog(`Sending request to: ${apiUrl}`);
      
      // Log request headers
      const headers = new Headers();
      headers.append('X-Debug-Info', 'UploadDebug-Component');
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        headers
      });
      
      addToLog(`Response status: ${response.status} ${response.statusText}`);
      addToLog(`Response headers: ${JSON.stringify([...response.headers.entries()])}`);
      
      if (!response.ok) {
        let errorText = '';
        try {
          const errorJson = await response.clone().json();
          errorText = JSON.stringify(errorJson, null, 2);
          addToLog(`Error response body (JSON): ${errorText}`);
        } catch (e) {
          try {
            errorText = await response.clone().text();
            addToLog(`Error response body (Text): ${errorText}`);
          } catch (e2) {
            addToLog(`Could not extract error details: ${e2}`);
          }
        }
        
        throw new Error(`Upload failed with status ${response.status}: ${errorText || response.statusText}`);
      }
      
      const result = await response.json();
      addToLog(`Upload successful: ${JSON.stringify(result, null, 2)}`);
      setResult(result);
    } catch (error) {
      console.error('Upload error:', error);
      addToLog(`Upload error: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        addToLog('NETWORK ERROR DETAILS: This is likely a CORS or network connectivity issue');
        
        // Test network connectivity to API
        try {
          addToLog('Testing API connectivity...');
          const testResponse = await fetch('https://devmcard.pkc.pub/v1/health', { method: 'GET' });
          addToLog(`API health check status: ${testResponse.status}`);
          const healthData = await testResponse.text();
          addToLog(`API health response: ${healthData}`);
        } catch (healthError) {
          addToLog(`API health check failed: ${healthError instanceof Error ? healthError.message : String(healthError)}`);
        }
      }
    } finally {
      setLoading(false);
    }
  };
  
  const uploadWithService = async () => {
    if (!file) {
      addToLog('No file selected');
      return;
    }
    
    addToLog(`Starting MCardService upload for ${file.name}...`);
    setLoading(true);
    
    try {
      const service = new MCardService();
      
      // Monkey patch console.log to capture service logs
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      
      console.log = (...args) => {
        originalConsoleLog(...args);
        addToLog(`[Service Log] ${args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ')}`);
      };
      
      console.error = (...args) => {
        originalConsoleError(...args);
        addToLog(`[Service Error] ${args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ')}`);
      };
      
      // Perform the upload
      const metadata = {
        filename: file.name,
        originalType: file.type || 'application/octet-stream',
        size: file.size
      };
      
      const response = await service.uploadFile(file, metadata);
      
      // Restore console functions
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      
      addToLog(`Upload successful: ${JSON.stringify(response, null, 2)}`);
      setResult(response);
    } catch (error) {
      console.error('Service upload error:', error);
      addToLog(`Service upload error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };
  
  const clearLogs = () => {
    setLog([]);
    setResult(null);
  };
  
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">File Upload Debug Tool</h1>
      
      <div className="flex flex-col gap-4 mb-6">
        <div className="p-4 border rounded-md">
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="mb-4"
          />
          
          {file && (
            <div className="mb-4 p-2 bg-gray-100 rounded">
              <p>Selected file: <strong>{file.name}</strong></p>
              <p>Type: {file.type || 'unknown'}</p>
              <p>Size: {(file.size / 1024).toFixed(2)} KB</p>
            </div>
          )}
          
          <div className="flex gap-2">
            <button 
              onClick={uploadWithFetch}
              disabled={!file || loading}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300"
            >
              Upload with Direct Fetch
            </button>
            
            <button 
              onClick={uploadWithService}
              disabled={!file || loading}
              className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-green-300"
            >
              Upload with MCardService
            </button>
            
            <button 
              onClick={clearLogs}
              className="px-4 py-2 bg-gray-500 text-white rounded"
            >
              Clear Logs
            </button>
          </div>
        </div>
        
        {result && (
          <div className="p-4 border rounded-md bg-green-50">
            <h2 className="text-lg font-semibold mb-2">Upload Result</h2>
            <pre className="bg-white p-2 overflow-auto max-h-40 rounded">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
        
        <div className="p-4 border rounded-md">
          <h2 className="text-lg font-semibold mb-2">Debug Log</h2>
          <div className="bg-black text-green-400 p-2 rounded h-96 overflow-auto font-mono text-sm">
            {log.map((entry, i) => (
              <div key={i}>{entry}</div>
            ))}
            {loading && <div className="animate-pulse">Processing...</div>}
          </div>
        </div>
      </div>
      
      <div className="p-4 border rounded-md bg-yellow-50">
        <h2 className="text-lg font-semibold mb-2">Test Instructions</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Select different file types (try both working types and problematic types like JPG/MP3)</li>
          <li>Test upload with both Direct Fetch and MCardService methods</li>
          <li>Compare the logs for successful uploads vs failed uploads</li>
          <li>Look for differences in request headers, content types, or error patterns</li>
          <li>Check browser console for CORS errors (may not appear in this component's logs)</li>
        </ol>
      </div>
    </div>
  );
}
