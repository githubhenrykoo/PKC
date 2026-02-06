import { useState, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { googleDocsService } from './google-docs.js';
import { googleDocsMCardService } from './google-docs-mcard-service.js';
import { getGoogleCredentials } from '../../utils/runtime-env.ts';
import { createPresentation, addSlide, addTextBox } from '../../components/googleslides/google-slides.js';

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
          // Only reset authentication state, not document content
          setGapiInited(false);
          setGisInited(false);
          setTokenClient(null);
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

  const handleConvertToSlides = useCallback(async () => {
    if (!selectedDocId) {
      console.error('No document ID available');
      setSaveStatus('Convert failed: No document ID');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    if (!googleDocsService.isAuthenticated()) {
      setSaveStatus('Please authenticate first');
      setTimeout(() => setSaveStatus(''), 3000);
      return;
    }

    try {
      setSaveStatus('Converting document to slides...');

      // Get the document content
      const doc = await googleDocsService.getDocument(selectedDocId);
      const markdown = googleDocsService.convertDocToMarkdown(doc);

      // Create a new presentation
      const presentationTitle = doc.title || 'Converted Document';
      const presentation = await createPresentation(presentationTitle);

      // Parse the markdown content and create slides
      const lines = markdown.split('\n').filter(line => line.trim());
      let slideCount = 0;

      // Create the first slide with the document title
      const firstSlideResult = await addSlide(presentation.presentationId, 'TITLE_AND_BODY');
      const firstSlideId = firstSlideResult.slideId;
      await addTextBox(presentation.presentationId, firstSlideId, presentationTitle, 100, 100, 600, 100);
      slideCount++;

      // Create slides based on document structure
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('#')) {
          // This is a heading - create a new slide for it (skip the first slide we already created)
          if (slideCount > 1) {
            const slideResult = await addSlide(presentation.presentationId, 'TITLE_AND_BODY');
            const slideId = slideResult.slideId;

            // Extract heading text (remove # symbols)
            const headingText = line.replace(/^#+\s*/, '').trim();

            // Add the heading as the title of the slide
            await addTextBox(presentation.presentationId, slideId, headingText, 100, 100, 600, 100);

            slideCount++;

            // If there are content lines after this heading, add them to the same slide
            let contentLines = [];
            let j = i + 1;
            while (j < lines.length && !lines[j].trim().startsWith('#')) {
              contentLines.push(lines[j].trim());
              j++;
            }

            if (contentLines.length > 0) {
              const contentText = contentLines.join('\n');
              await addTextBox(presentation.presentationId, slideId, contentText, 100, 220, 600, 300);
            }

            i = j - 1; // Skip the content lines we already processed
          } else {
            // For the first heading, add content to the first slide we created
            const headingText = line.replace(/^#+\s*/, '').trim();
            await addTextBox(presentation.presentationId, firstSlideId, headingText, 100, 220, 600, 100);

            // If there are content lines after this heading, add them to the same slide
            let contentLines = [];
            let j = i + 1;
            while (j < lines.length && !lines[j].trim().startsWith('#')) {
              contentLines.push(lines[j].trim());
              j++;
            }

            if (contentLines.length > 0) {
              const contentText = contentLines.join('\n');
              await addTextBox(presentation.presentationId, firstSlideId, contentText, 100, 340, 600, 200);
            }

            i = j - 1; // Skip the content lines we already processed
            slideCount++;
          }
        } else if (slideCount === 1) {
          // If we haven't created additional slides yet and this isn't a heading,
          // add content to the first slide
          if (line) {
            await addTextBox(presentation.presentationId, firstSlideId, line, 100, 220, 600, 200);
          }
        }
      }

      setSaveStatus(`✅ Successfully converted to slides! Created ${slideCount} slides in "${presentationTitle}"`);
      setTimeout(() => setSaveStatus(''), 5000);

      // Open the presentation in a new tab
      if (presentation.presentationUrl) {
        window.open(presentation.presentationUrl, '_blank');
      }

    } catch (error) {
      console.error('❌ Convert to slides failed:', error);
      setSaveStatus(`Convert failed: ${error.message}`);
      setTimeout(() => setSaveStatus(''), 5000);
    }
  }, [selectedDocId]);

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
            </svg>
          </div>
          
          {!credentialsLoaded ? (
            <div className="space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading credentials...</p>
            </div>
          ) : (
            <button 
              onClick={handleAuthClick}
              disabled={!gapiInited || !gisInited || !credentialsLoaded}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              title="Sign in with Google to access documents"
            >
              <img 
                src="https://www.google.com/favicon.ico" 
                alt="Google" 
                className="w-5 h-5"
              />
              <span>
                {!gapiInited || !gisInited ? 'Initializing...' : 'Sign in with Google'}
              </span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Main interface - show regardless of authentication status
  return (
    <div className="h-full w-full bg-gray-50 dark:bg-gray-900">
      <div className="h-full p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Google Docs</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">View and export your documents</p>
            </div>
          </div>
          
          {/* Show sign-in button if not authenticated */}
          {!googleDocsService.isAuthenticated() && (
            <button
              onClick={handleAuthClick}
              disabled={!gapiInited || !gisInited}
              className="px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md"
              title="Sign in with Google to access documents">
              <img 
                src="https://www.google.com/favicon.ico" 
                alt="Google" 
                className="w-5 h-5"
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
            <div className="flex gap-2 items-center">
              {!showUrlInput ? (
                <>
                  <button
                    onClick={createPicker}
                    className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Select Document
                  </button>
                  <button
                    onClick={toggleUrlInput}
                    className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Open via Link
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={docUrlInput}
                    onChange={(e) => setDocUrlInput(e.target.value)}
                    placeholder="https://docs.google.com/document/d/..."
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm w-80 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUrlSubmit();
                    }}
                  />
                  <button
                    onClick={handleUrlSubmit}
                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow"
                  >
                    Open
                  </button>
                  <button
                    onClick={toggleUrlInput}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-all duration-200 text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
          {selectedDocId && (
            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Document selected
            </span>
          )}
        </div>
        
        {/* Action buttons */}
        {googleDocsService.isAuthenticated() && selectedDocId && (
          <div className="flex gap-2 pb-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={handleConvertToSlides}
              className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow"
              title="Convert this document to a Google Slides presentation"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M7 4h10M7 4v16a1 1 0 001 1h8a1 1 0 001-1V4M9 8h6m-6 4h6m-6 4h4" />
              </svg>
              Convert to Slides
            </button>

            <button
              onClick={createPicker}
              className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12M8 12h12m-12 5h12M4 7h.01M4 12h.01M4 17h.01" />
              </svg>
              Change Document
            </button>

            <button
              onClick={handleExportMarkdown}
              className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 active:bg-green-800 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow"
              title="Export document as Markdown using Google Docs export"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
            <button
              onClick={() => loadMarkdownVersion(selectedDocId)}
              className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow"
              title="Refresh document"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Refresh
            </button>
          </div>
        )}

        {/* Document viewer */}
        <div className="flex-1 py-10 bg-gray-50 dark:bg-gray-900">
          <div
            className="markdown-preview"
            style={{
              width: '816px',
              minHeight: '1056px',
              margin: '0 auto',
              padding: '96px 72px',
              backgroundColor: '#ffffff',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
              fontSize: '11pt',
              lineHeight: 1.5,
              color: '#202124',
              fontFamily: '"Google Sans", Roboto, Arial, sans-serif',
            }}
            dangerouslySetInnerHTML={renderMarkdown(editorContent)}
          />
        </div>

        {/* Status notification */}
        {saveStatus && (
          <div className="fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg bg-white dark:bg-gray-800 border-l-4 transition-all duration-200"
            style={{
              borderLeftColor: saveStatus.includes('Error') || saveStatus.includes('failed') ? '#ef4444' : 
                               saveStatus.includes('loaded') || saveStatus.includes('Exported') ? '#10b981' : '#3b82f6'
            }}>
            <div className="flex items-center gap-2">
              {saveStatus.includes('Error') || saveStatus.includes('failed') ? (
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              ) : saveStatus.includes('loaded') || saveStatus.includes('Exported') ? (
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
              <span className="text-sm font-medium text-gray-900 dark:text-white">{saveStatus}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleDocsPanel;
