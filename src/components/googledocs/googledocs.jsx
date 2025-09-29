import { useState, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { googleDocsService } from './google-docs.js';
import { googleDocsMCardService } from './google-docs-mcard-service.js';
import { getGoogleCredentials } from '../../utils/runtime-env.ts';

const GoogleDocsPanel = () => {
  const [gapiInited, setGapiInited] = useState(false);
  const [gisInited, setGisInited] = useState(false);
  const [tokenClient, setTokenClient] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [isPreview] = useState(true);
  const [pickerInited, setPickerInited] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [docUrlInput, setDocUrlInput] = useState('');
  
  // Runtime environment credentials
  const [credentials, setCredentials] = useState(null);
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);
  
  // MCard sync status
  const [mcardSyncStatus, setMcardSyncStatus] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const SCOPES = 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.readonly';

  // Fetch credentials from runtime environment
  const fetchRuntimeCredentials = useCallback(async () => {
    try {
      console.log('🔄 Fetching Google Docs credentials from runtime environment...');
      const creds = getGoogleCredentials();
      
      if (creds && creds.isValid) {
        setCredentials(creds);
        setCredentialsLoaded(true);
        
        console.log('✅ Google Docs credentials loaded:', {
          hasApiKey: creds.hasApiKey,
          hasClientId: creds.hasClientId,
          hasClientSecret: creds.hasClientSecret,
          isValid: creds.isValid
        });
        
        return creds;
      } else {
        console.warn('Google Docs: Missing required credentials');
        setCredentialsLoaded(true);
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching Google Docs credentials:', error);
      setCredentialsLoaded(true);
      return null;
    }
  }, []);

  // Validate credentials
  const validateCredentials = useCallback((creds) => {
    if (!creds) return false;
    return creds.isValid && creds.hasApiKey && creds.hasClientId && creds.hasClientSecret;
  }, []);

  useEffect(() => {
    // Initialize component with runtime credentials
    const initializeComponent = async () => {
      console.log('🔄 Initializing Google Docs component...');
      
      try {
        // First fetch credentials
        const creds = await fetchRuntimeCredentials();
        if (!validateCredentials(creds)) {
          console.error('❌ Invalid Google Docs credentials, skipping API initialization');
          return;
        }
        
        // Initialize the service with credentials
        await googleDocsService.loadGoogleAPIs();
        setGapiInited(true);
        setGisInited(true);
        
        // Load Google Picker API script
        const pickerScript = document.createElement('script');
        pickerScript.src = 'https://apis.google.com/js/platform.js';
        pickerScript.onload = () => setPickerInited(true);
        document.head.appendChild(pickerScript);
        
        console.log('✅ Google Docs component initialized successfully');
        
      } catch (error) {
        console.error('❌ Failed to initialize Google Docs component:', error);
      }
    };

    initializeComponent();

    // Listen for runtime environment changes
    const handleRuntimeEnvChange = async () => {
      console.log('🔄 Runtime environment changed, refreshing Google Docs credentials...');
      try {
        const creds = await fetchRuntimeCredentials();
        if (validateCredentials(creds)) {
          // Reset component state when credentials change
          setGapiInited(false);
          setGisInited(false);
          setTokenClient(null);
          setSelectedDocId(null);
          setEditorContent('');
          setSaveStatus('Credentials updated - please re-authenticate');
          
          // Reinitialize with new credentials
          await googleDocsService.loadGoogleAPIs();
          setGapiInited(true);
          setGisInited(true);
          
          console.log('✅ Google Docs credentials refreshed');
          
          // Dispatch custom event
          window.dispatchEvent(new CustomEvent('google-docs-credentials-updated', {
            detail: {
              newCredentials: creds,
              timestamp: new Date().toISOString()
            }
          }));
        }
      } catch (error) {
        console.error('❌ Failed to refresh Google Docs credentials:', error);
        setCredentialsError(error.message);
      }
    };

    window.addEventListener('runtime-env-changed', handleRuntimeEnvChange);
    console.log('👂 Google Docs: Listening for runtime environment changes');

    return () => {
      // Cleanup scripts on unmount
      const scripts = document.querySelectorAll('script[src*="google"]');
      scripts.forEach(script => script.remove());
      
      // Remove event listener
      window.removeEventListener('runtime-env-changed', handleRuntimeEnvChange);
    };
  }, [fetchRuntimeCredentials, validateCredentials]);

  // Handle authentication using the service
  const handleAuthClick = useCallback(async () => {
    // Check if APIs are ready and credentials are valid
    if (!gapiInited || !gisInited || !credentialsLoaded) {
      console.warn('❌ Google Docs: APIs not ready or credentials not loaded');
      setSaveStatus('Please wait for initialization to complete...');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    if (!validateCredentials(credentials)) {
      console.warn('❌ Google Docs: Invalid credentials');
      setSaveStatus('Authentication blocked: Missing or invalid credentials');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    try {
      setSaveStatus('Authenticating...');
      const tokenResponse = await googleDocsService.authenticate();
      
      // Set tokenClient to trigger UI updates
      setTokenClient(true);
      
      setSaveStatus('Authentication successful! You can now access Google Docs.');
      setTimeout(() => setSaveStatus(''), 3000);
      
      console.log('✅ Google Docs: Authentication completed successfully');
    } catch (error) {
      console.error('❌ Google Docs: Authentication failed:', error);
      setSaveStatus(`Authentication failed: ${error.message}`);
      setTimeout(() => setSaveStatus(''), 5000);
    }
  }, [gapiInited, gisInited, credentialsLoaded, credentials, validateCredentials]);
  
  // Toggle URL input visibility
  const toggleUrlInput = () => {
    setShowUrlInput(!showUrlInput);
    setDocUrlInput('');
  };
  
  // Extract document ID from Google Docs URL using service
  const extractDocIdFromUrl = (url) => {
    return googleDocsService.extractDocIdFromUrl(url);
  };
  
  // Handle URL submission
  const handleUrlSubmit = () => {
    if (!docUrlInput.trim()) {
      setSaveStatus('Please enter a valid Google Docs URL');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }
    
    const docId = extractDocIdFromUrl(docUrlInput.trim());
    if (!docId) {
      setSaveStatus('Invalid Google Docs URL');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }
    
    setSelectedDocId(docId);
    // Load the markdown version directly from export URL
    loadMarkdownVersion(docId);
    setShowUrlInput(false);
  };
  

  // All other load functions removed - only using direct markdown export

  // Save functionality removed - no longer syncing with Google Docs or MCards

  // Debounced save function removed

  const handleEditorChange = (e) => {
    const content = e.currentTarget;
    
    // Ensure proper list formatting
    const lists = content.querySelectorAll('ol, ul');
    lists.forEach(list => {
      list.style.paddingLeft = '40px';
      list.style.margin = '0';
      
      const items = list.querySelectorAll('li');
      items.forEach(item => {
        item.style.marginBottom = '0.25em';
        if (list.nodeName === 'OL') {
          item.style.listStyleType = 'decimal';
        } else {
          item.style.listStyleType = 'disc';
        }
      });
    });

    const newContent = content.innerHTML;
    setEditorContent(newContent);
  };

  // Function to render markdown with HTML support and handle Google Docs image references
  const renderMarkdown = (content) => {
    try {
      marked.setOptions({
        headerIds: true,
        mangle: false,
        headerPrefix: '',
        breaks: true,
        gfm: true,
        xhtml: true,
        smartLists: true,
        smartypants: true
      });

      // Extract image references from the content
      // Google Docs exports images in format: ![][imageN] followed by [imageN]: <data:image/...> or URL
      const imageReferences = {};
      const imageRefRegex = /\[([^\]]+)\]:\s*<?([^>\s]+)>?/g;
      let match;
      
      // Find all image references and store them in a map
      while ((match = imageRefRegex.exec(content)) !== null) {
        const refName = match[1];
        const refUrl = match[2];
        imageReferences[refName] = refUrl;
      }
      
      // Pre-process the content to handle special cases
      let processedContent = content
        // Handle bold with double asterisks
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Handle italic with single asterisks
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Handle bold+italic with triple asterisks
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        // Handle escaped characters
        .replace(/\\([\*\\])/g, '$1')
        // Replace image references with direct img tags for better rendering
        .replace(/!\[([^\]]*)\]\[([^\]]+)\]/g, (match, alt, refName) => {
          if (imageReferences[refName]) {
            return `<img src="${imageReferences[refName]}" alt="${alt || refName}" style="max-width: 100%;" />`;
          }
          return match; // Keep original if reference not found
        });

      const html = marked(processedContent);
      
      // Add custom styles for headings to ensure proper sizing
      const styledHtml = html
        .replace(/<h1>/g, '<h1 style="font-size: 24pt; font-weight: 500; margin-top: 24px; margin-bottom: 8px;">')
        .replace(/<h2>/g, '<h2 style="font-size: 18pt; font-weight: 500; margin-top: 20px; margin-bottom: 6px;">')
        .replace(/<h3>/g, '<h3 style="font-size: 16pt; font-weight: 500; margin-top: 16px; margin-bottom: 4px;">')
        .replace(/<h4>/g, '<h4 style="font-size: 14pt; font-weight: 500; margin-top: 14px; margin-bottom: 4px;">')
        .replace(/<h5>/g, '<h5 style="font-size: 12pt; font-weight: 500; margin-top: 12px; margin-bottom: 4px;">')
        .replace(/<h6>/g, '<h6 style="font-size: 11pt; font-weight: 500; margin-top: 12px; margin-bottom: 4px;">');
      
      return { __html: styledHtml };
    } catch (error) {
      console.error('Error parsing markdown:', error);
      return { __html: content };
    }
  };
  
  // Update the preview div styles to better handle markdown content
  <div
    className="markdown-preview"
    style={{
      width: '816px',
      minHeight: '1056px',
      margin: '0 auto',
      padding: '96px 72px',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
      fontSize: '11pt',
      lineHeight: 1.5,
      color: '#202124',
      fontFamily: '"Google Sans", Roboto, Arial, sans-serif',
    }}
    dangerouslySetInnerHTML={renderMarkdown(editorContent)}
  />

  const handleExportMarkdown = useCallback(async () => {
    if (!selectedDocId) {
      console.error('No document ID available');
      setSaveStatus('Export failed: No document ID');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    if (!googleDocsService.isAuthenticated()) {
      setSaveStatus('Please authenticate first');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    try {
      setSaveStatus('Exporting document...');
      const result = await googleDocsService.exportAsMarkdown(selectedDocId);
      
      if (result.success) {
        setSaveStatus(`Exported as ${result.filename}`);
        setTimeout(() => setSaveStatus(''), 3000);
        
        // Also update the editor content with the exported markdown
        setEditorContent(result.markdown);
      }
    } catch (error) {
      console.error('❌ Export failed:', error);
      setSaveStatus(`Export failed: ${error.message}`);
      setTimeout(() => setSaveStatus(''), 5000);
    }
  }, [selectedDocId]);
  
  // Function to load the markdown version of a Google Doc
  const sendToMCard = useCallback(async (markdownContent, documentInfo = {}, fullDocument = null) => {
    if (!markdownContent && !fullDocument) {
      console.warn('❌ No content to send to MCard');
      return;
    }

    try {
      setIsSyncing(true);
      setMcardSyncStatus('Saving to MCard...');
      
      // Create comprehensive JSON document structure
      const jsonDocument = {
        type: 'google_docs_document',
        documentId: selectedDocId || 'unknown',
        title: documentInfo.title || fullDocument?.title || 'Google Docs Document',
        
        // Content in multiple formats
        content: {
          markdown: markdownContent,
          originalDocument: fullDocument ? {
            documentId: fullDocument.documentId,
            title: fullDocument.title,
            body: fullDocument.body,
            documentStyle: fullDocument.documentStyle,
            namedStyles: fullDocument.namedStyles,
            revisionId: fullDocument.revisionId,
            suggestionsViewMode: fullDocument.suggestionsViewMode
          } : null
        },
        
        // Metadata
        metadata: {
          source: 'google_docs_integration',
          exported_at: new Date().toISOString(),
          word_count: markdownContent ? markdownContent.split(/\s+/).filter(word => word.length > 0).length : 0,
          character_count: markdownContent ? markdownContent.length : 0,
          paragraph_count: markdownContent ? markdownContent.split('\n').filter(line => line.trim().length > 0).length : 0,
          
          // Document properties from Google Docs
          document_properties: fullDocument ? {
            revision_id: fullDocument.revisionId,
            suggestions_view_mode: fullDocument.suggestionsViewMode,
            document_style: fullDocument.documentStyle,
            has_named_styles: !!(fullDocument.namedStyles?.styles),
            content_elements_count: fullDocument.body?.content?.length || 0
          } : null,
          
          // Additional info
          ...documentInfo
        },
        
        // Processing info
        processing: {
          processed_at: new Date().toISOString(),
          format: 'json',
          version: '1.0',
          processor: 'google_docs_mcard_integration'
        }
      };

      // Save the JSON document to MCard
      const result = await googleDocsMCardService.saveDocument(jsonDocument);
      
      if (result.success) {
        setMcardSyncStatus('✅ Saved to MCard successfully');
        console.log('✅ Document saved to MCard in JSON format:', result);
      }
      
      setTimeout(() => {
        setMcardSyncStatus('');
        setIsSyncing(false);
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error sending to MCard:', error);
      setMcardSyncStatus(`❌ Failed to save: ${error.message}`);
      setTimeout(() => {
        setMcardSyncStatus('');
        setIsSyncing(false);
      }, 5000);
    }
  }, [selectedDocId]);

  // Create and render a Google Picker
  const createPicker = useCallback(() => {
    if (!window.google || !pickerInited || !googleDocsService.isAuthenticated()) {
      console.error('Google Picker API not loaded or user not authenticated');
      setSaveStatus('Please authenticate first to use document picker');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }
    
    // Hide URL input if shown
    setShowUrlInput(false);
    
    // Load the picker API
    window.gapi.load('picker', () => {
      const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
        .setMimeTypes('application/vnd.google-apps.document')
        .setMode(window.google.picker.DocsViewMode.LIST);
      
      const picker = new window.google.picker.PickerBuilder()
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .setAppId(credentials?.clientId?.split('-')[0] || '')
        .setOAuthToken(window.gapi.client.getToken()?.access_token)
        .addView(view)
        .setTitle('Select a Google Document')
        .setCallback(pickerCallback)
        .build();
        
      picker.setVisible(true);
    });
  }, [pickerInited, credentials, credentialsLoaded]);
  
  // Handle picker selection
  const pickerCallback = useCallback((data) => {
    if (data.action === window.google.picker.Action.PICKED) {
      const document = data.docs[0];
      const docId = document.id;
      setSelectedDocId(docId);
      // Load the document content
      loadMarkdownVersion(docId);
      setSaveStatus(`Selected: ${document.name}`);
      setTimeout(() => setSaveStatus(''), 3000);
    }
  }, []);

  const loadMarkdownVersion = useCallback(async (docId) => {
    try {
      if (!docId) {
        console.error('No document ID provided');
        return;
      }
      
      setSaveStatus('Loading document...');
      
      // Check if authenticated
      if (!googleDocsService.isAuthenticated()) {
        setSaveStatus('Authentication required');
        try {
          await googleDocsService.authenticate();
        } catch (authError) {
          setSaveStatus(`Authentication failed: ${authError.message}`);
          setTimeout(() => setSaveStatus(''), 5000);
          return;
        }
      }

      try {
        // Get document using the service
        const doc = await googleDocsService.getDocument(docId);
        const markdown = googleDocsService.convertDocToMarkdown(doc);
        
        setEditorContent(markdown);
        setSaveStatus('Document loaded successfully');
        
        // Automatically send to MCard with full document data
        await sendToMCard(markdown, { title: doc.title }, doc);
        
        return markdown;
      } catch (error) {
        console.error('❌ Failed to load document:', error);
        setSaveStatus(`Failed to load document: ${error.message}`);
        setTimeout(() => setSaveStatus(''), 5000);
      }
    } catch (error) {
      console.error('❌ Error in loadMarkdownVersion:', error);
      setSaveStatus(`Error: ${error.message}`);
      setTimeout(() => setSaveStatus(''), 5000);
    }
  }, []);

  // Show loading screen only while initializing, not when ready for authentication
  if (!credentialsLoaded || !gapiInited || !gisInited) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
      }}>
        <button 
          onClick={handleAuthClick}
          disabled={!gapiInited || !gisInited || !credentialsLoaded}
          className="bg-white text-gray-700 px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center space-x-3 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          title="Sign in with Google to access documents"
        >
          <img 
            src="https://www.google.com/favicon.ico" 
            alt="Google" 
            className="w-5 h-5"
          />
          <span>
            {!credentialsLoaded ? 'Loading credentials...' : 
             !gapiInited || !gisInited ? 'Initializing...' :
             'Sign in with Google'}
          </span>
        </button>
        
        {!credentialsLoaded && (
          <div style={{ marginTop: '12px', color: '#6b7280', fontSize: '14px' }}>
            Fetching Google Docs credentials from runtime environment...
          </div>
        )}
      </div>
    );
  }

  // Main interface - show regardless of authentication status
  return (
    <div className="google-docs-panel" style={{
      maxWidth: '850px',
      margin: '0 auto',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      display: 'flex',
      flexDirection: 'column',
    }}>
      
      <div style={{
        padding: '8px 16px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#ffffff'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Show sign-in button if not authenticated */}
          {!googleDocsService.isAuthenticated() && (
            <button
              onClick={handleAuthClick}
              disabled={!gapiInited || !gisInited}
              style={{
                backgroundColor: '#4285f4',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                opacity: (!gapiInited || !gisInited) ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              title="Sign in with Google to access documents">
              <img 
                src="https://www.google.com/favicon.ico" 
                alt="Google" 
                style={{ width: '16px', height: '16px' }}
              />
              <span>
                {!credentialsLoaded ? 'Loading...' : 
                 !gapiInited || !gisInited ? 'Initializing...' :
                 'Sign in with Google'}
              </span>
            </button>
          )}
          
          {/* Show document selection if authenticated */}
          {googleDocsService.isAuthenticated() && !selectedDocId && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {!showUrlInput ? (
                <>
                  <button
                    onClick={createPicker}
                    style={{
                      backgroundColor: '#f1f3f4',
                      color: '#5f6368',
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    Select Document
                  </button>
                  <button
                    onClick={toggleUrlInput}
                    style={{
                      backgroundColor: '#f1f3f4',
                      color: '#5f6368',
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    Open via Link
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    value={docUrlInput}
                    onChange={(e) => setDocUrlInput(e.target.value)}
                    placeholder="https://docs.google.com/document/d/..."
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '4px',
                      fontSize: '14px',
                      width: '300px',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUrlSubmit();
                    }}
                  />
                  <button
                    onClick={handleUrlSubmit}
                    style={{
                      backgroundColor: '#1a73e8',
                      color: '#ffffff',
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    Open
                  </button>
                  <button
                    onClick={toggleUrlInput}
                    style={{
                      backgroundColor: '#f1f3f4',
                      color: '#5f6368',
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
          {selectedDocId && (
            <span style={{ fontSize: '14px', color: '#5f6368' }}>
              Document selected
            </span>
          )}
        </div>
        
        {/* Moved buttons to the right */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {googleDocsService.isAuthenticated() && selectedDocId && (
            <>
              <button
                onClick={createPicker}
                style={{
                  backgroundColor: '#f1f3f4',
                  color: '#5f6368',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  marginRight: '8px',
                  transition: 'all 0.2s ease',
                }}
              >
                Change Document
              </button>

              <button
                onClick={handleExportMarkdown}
                style={{
                  backgroundColor: '#34a853',
                  color: '#ffffff',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                title="Export document as Markdown using Google Docs export"
              >
                Export
              </button>
              <button
                onClick={() => loadMarkdownVersion(selectedDocId)}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh events"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <span className="sr-only">Refresh</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{
        flex: 1,
        padding: '40px 0',
        backgroundColor: '#f8f9fa',
      }}>
        <div
          className="markdown-preview"
          style={{
            width: '816px',
            minHeight: '1056px',
            margin: '0 auto',
            padding: '96px 72px',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
            fontSize: '11pt',
            lineHeight: 1.5,
            color: '#202124',
            fontFamily: '"Google Sans", Roboto, Arial, sans-serif',
          }}
          dangerouslySetInnerHTML={renderMarkdown(editorContent)}
        />
      </div>

      {saveStatus && (
        <div style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          padding: '8px 12px',
          borderRadius: '4px',
          backgroundColor: '#ffffff',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          color: saveStatus.includes('Error') || saveStatus.includes('failed') ? '#ea4335' : 
                 saveStatus.includes('loaded') || saveStatus.includes('Exported') ? '#34a853' : '#1a73e8',
          fontSize: '13px',
          transition: 'all 0.2s ease',
        }}>
          {saveStatus}
        </div>
      )}
    </div>
  );
};

export default GoogleDocsPanel;