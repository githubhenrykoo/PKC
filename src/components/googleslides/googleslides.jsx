import React, { useState, useEffect } from 'react';
import { 
  loadGoogleApi, signIn, signOut, listPresentations, getPresentation, isInitialized,
  createPresentation, updateSlideText, addSlide, deleteSlide, addTextBox, addImage
} from './google-slides.js';
import { googleSlidesMCardService } from '../../services/google-slides-mcard-service.js';
import { ollamaService } from '../../services/ollama-service.js';

const GoogleSlides = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [presentations, setPresentations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mcardSyncStatus, setMcardSyncStatus] = useState(null);
  const [mcardSyncError, setMcardSyncError] = useState(null);
  const [selectedPresentation, setSelectedPresentation] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [slideContent, setSlideContent] = useState('');
  const [presentationDetails, setPresentationDetails] = useState(null);
  const [editorLoading, setEditorLoading] = useState(false);
  const [jsonEditorMode, setJsonEditorMode] = useState(false);
  const [originalJson, setOriginalJson] = useState(null);
  const [editedJson, setEditedJson] = useState('');
  const [jsonChanges, setJsonChanges] = useState([]);
  const [jsonEditorSyncStatus, setJsonEditorSyncStatus] = useState(null);
  
  // Ollama Chatbot states
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [ollamaAvailable, setOllamaAvailable] = useState(false);
  const [selectedSlideForRewrite, setSelectedSlideForRewrite] = useState(null);
  const [rewriteInstruction, setRewriteInstruction] = useState('');

  useEffect(() => {
    initializeGoogleSlides();
    checkOllamaAvailability();
  }, []);

  // Check Ollama availability
  const checkOllamaAvailability = async () => {
    try {
      const available = await ollamaService.isAvailable();
      setOllamaAvailable(available);
      console.log('🤖 Ollama availability:', available);
    } catch (error) {
      console.error('❌ Error checking Ollama availability:', error);
      setOllamaAvailable(false);
    }
  };

  // Handle keyboard events for modals
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (showEditor) {
          closePresentationEditor();
        } else if (showViewer) {
          closePresentationViewer();
        }
      }
    };

    if (showViewer || showEditor) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [showViewer, showEditor]);

  const initializeGoogleSlides = async () => {
    try {
      setLoading(true);
      await loadGoogleApi();
      
      // Check if already authenticated
      if (typeof window !== 'undefined' && window.gapi && window.gapi.client.getToken()) {
        setIsAuthenticated(true);
        await loadPresentations();
      }
    } catch (error) {
      console.error('Failed to initialize Google Slides:', error);
      setError('Failed to initialize Google Slides. Please check your API credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signIn();
      setIsAuthenticated(true);
      await loadPresentations();
    } catch (error) {
      console.error('Sign in failed:', error);
      
      let errorMessage = 'Sign in failed. Please try again.';
      if (error.error === 'popup_blocked_by_browser') {
        errorMessage = 'Please allow popups for this site to sign in with Google.';
      } else if (error.error === 'popup_closed_by_user') {
        errorMessage = 'Sign-in popup was closed. Please try again.';
      } else if (error.error === 'access_denied') {
        errorMessage = 'Access denied. Please grant Google Slides access to view your presentations.';
      } else if (error.error === 'coop_policy_error') {
        errorMessage = 'Browser security policy blocked the sign-in. Please try refreshing the page.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut();
      setIsAuthenticated(false);
      setPresentations([]);
      setError(null);
    } catch (error) {
      console.error('Sign out failed:', error);
      setError('Sign out failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadPresentations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listPresentations();
      const presentationList = response.result.files || [];
      setPresentations(presentationList);
      
      // Send presentations to MCard after successful load
      await sendPresentationsToMCard(presentationList);
      
    } catch (error) {
      console.error('Failed to load presentations:', error);
      setError('Failed to load presentations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendPresentationsToMCard = async (presentations) => {
    console.log('🔄 sendPresentationsToMCard called with', presentations.length, 'presentations');
    
    try {
      setMcardSyncStatus('syncing');
      setMcardSyncError(null);

      // Check if MCard service is available
      if (!googleSlidesMCardService) {
        throw new Error('Google Slides MCard service not available');
      }

      // Get user email if available
      const userEmail = window.gapi?.client?.getToken()?.access_token ? 
        'google_slides_user' : 'unknown_user';

      console.log('📤 Starting MCard sync for user:', userEmail);

      // Save presentations to MCard using the service
      const result = await googleSlidesMCardService.saveAllPresentationsToMCard(presentations, userEmail);
      
      console.log('✅ MCard sync result:', result);

      setMcardSyncStatus('success');
      console.log(`✅ Successfully synced ${result.savedCount} presentations to MCard`);
      
      // Show success message briefly
      setTimeout(() => {
        setMcardSyncStatus(null);
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error syncing presentations to MCard:', error);
      setMcardSyncStatus('error');
      setMcardSyncError(error.message || 'Failed to sync presentations to MCard');
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setMcardSyncStatus(null);
        setMcardSyncError(null);
      }, 5000);
    }
  };

  const sendJsonEditorToMCard = async (originalJson, editedJson, changes) => {
    console.log('🔄 sendJsonEditorToMCard called with', changes.length, 'changes');
    
    try {
      setJsonEditorSyncStatus('syncing');

      // Check if MCard service is available
      if (!googleSlidesMCardService) {
        throw new Error('Google Slides MCard service not available');
      }

      // Get user email if available
      const userEmail = window.gapi?.client?.getToken()?.access_token ? 
        'google_slides_user' : 'unknown_user';

      console.log('📤 Starting JSON editor MCard sync for user:', userEmail);

      // Save JSON editor session to MCard
      const jsonEditorHash = await googleSlidesMCardService.saveJsonEditorToMCard(
        selectedPresentation.id, 
        originalJson, 
        editedJson, 
        changes, 
        userEmail
      );

      // Save human-readable summary
      const summaryHash = await googleSlidesMCardService.saveJsonEditorSummaryToMCard(
        selectedPresentation.id,
        selectedPresentation.name,
        changes,
        userEmail
      );
      
      console.log('✅ JSON editor MCard sync result:', { jsonEditorHash, summaryHash });

      setJsonEditorSyncStatus('success');
      console.log(`✅ Successfully synced JSON editor session with ${changes.length} changes to MCard`);
      
      // Show success message briefly
      setTimeout(() => {
        setJsonEditorSyncStatus(null);
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error syncing JSON editor to MCard:', error);
      setJsonEditorSyncStatus('error');
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setJsonEditorSyncStatus(null);
      }, 5000);
    }
  };

  const autoSaveJsonToMCard = async (presentationDetails, presentationInfo) => {
    console.log('🔄 autoSaveJsonToMCard called - automatically saving JSON data on editor open');
    
    try {
      setJsonEditorSyncStatus('syncing');

      // Check if MCard service is available
      if (!googleSlidesMCardService) {
        throw new Error('Google Slides MCard service not available');
      }

      // Get user email if available
      const userEmail = window.gapi?.client?.getToken()?.access_token ? 
        'google_slides_user' : 'unknown_user';

      console.log('📤 Auto-saving JSON data to MCard for user:', userEmail);

      // Save the raw JSON presentation data automatically
      const jsonData = JSON.stringify(presentationDetails, null, 2);
      
      // Create an auto-save document
      const autoSaveDocument = {
        type: 'google_slides_json_auto_save',
        presentationId: presentationInfo.id,
        presentationTitle: presentationInfo.name || 'Untitled Presentation',
        autoSaveSession: {
          timestamp: new Date().toISOString(),
          user: userEmail,
          trigger: 'json_editor_opened'
        },
        presentationData: presentationDetails,
        metadata: {
          source: 'google_slides_json_editor_auto_save',
          format: 'json',
          version: '1.0',
          savedAt: new Date().toISOString(),
          slideCount: presentationDetails?.slides?.length || 0,
          totalElements: presentationDetails?.slides?.reduce((total, slide) => 
            total + (slide?.pageElements?.length || 0), 0) || 0
        }
      };

      // Save auto-save document to MCard
      const autoSaveJson = JSON.stringify(autoSaveDocument, null, 2);
      const autoSaveHash = await googleSlidesMCardService.mcardService.storeContent(autoSaveJson);

      // Also save a human-readable summary for auto-save
      const autoSaveSummary = {
        type: 'google_slides_json_auto_save_summary',
        title: 'Google Slides JSON Auto-Save Summary',
        presentation: {
          id: presentationInfo.id,
          title: presentationInfo.name || 'Untitled Presentation'
        },
        autoSaveSession: {
          timestamp: new Date().toISOString(),
          timestampFormatted: `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
          user: userEmail,
          trigger: 'JSON Editor Opened'
        },
        presentationStats: {
          totalSlides: presentationDetails?.slides?.length || 0,
          totalElements: presentationDetails?.slides?.reduce((total, slide) => 
            total + (slide?.pageElements?.length || 0), 0) || 0,
          presentationSize: `${Math.round(JSON.stringify(presentationDetails).length / 1024)} KB`
        },
        summary: {
          message: 'Presentation JSON data automatically saved when JSON editor was opened.',
          purpose: 'Backup and reference copy of presentation structure'
        },
        tips: [
          'This auto-save happens every time someone opens the JSON editor',
          'Use this data to restore or analyze presentation structure',
          'All presentation elements and properties are preserved'
        ],
        metadata: {
          source: 'google_slides_json_editor_auto_save',
          format: 'summary',
          version: '1.0',
          generatedAt: new Date().toISOString()
        }
      };

      const summaryJson = JSON.stringify(autoSaveSummary, null, 2);
      const summaryHash = await googleSlidesMCardService.mcardService.storeContent(summaryJson);
      
      console.log('✅ JSON auto-save MCard sync result:', { autoSaveHash, summaryHash });

      setJsonEditorSyncStatus('success');
      console.log(`✅ Successfully auto-saved JSON data to MCard`);
      
      // Show success message briefly
      setTimeout(() => {
        setJsonEditorSyncStatus(null);
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error auto-saving JSON to MCard:', error);
      setJsonEditorSyncStatus('error');
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setJsonEditorSyncStatus(null);
      }, 5000);
    }
  };

  // Chatbot functions
  const toggleChatbot = () => {
    setShowChatbot(!showChatbot);
    if (!showChatbot && chatMessages.length === 0) {
      // Add welcome message with examples
      const welcomeMessage = `Hello! 🤖 I'm your AI assistant for Google Slides. I can automatically rewrite and apply changes to your slides!

**What I can do:**
• Rewrite slide content in different styles
• Apply changes directly to Google Slides
• Save all changes to MCard automatically

**Try these commands:**
• "Make slide 1 more professional"
• "Rewrite slide 2 to be casual"
• "Change slide 3 to be engaging"
• "Make slide 1 concise"

**Quick Actions:** Use the buttons above for instant rewriting!

How can I help you today?`;

      setChatMessages([{
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = {
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    const originalInput = chatInput.trim();
    setChatInput('');
    setChatLoading(true);

    try {
      // Check if this is a rewrite request
      const rewriteRequest = parseRewriteRequest(originalInput);
      
      if (rewriteRequest) {
        // Handle automatic rewrite request
        console.log('🤖 Detected rewrite request:', rewriteRequest);
        
        const confirmMessage = {
          role: 'assistant',
          content: `🎯 I understand you want to rewrite slide ${rewriteRequest.slideNumber} to be ${rewriteRequest.style}. Let me do that for you right now!`,
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, confirmMessage]);
        
        // Automatically execute the rewrite
        await rewriteSlideContent(rewriteRequest.slideIndex, rewriteRequest.style);
        
      } else {
        // Handle regular chat
        const response = await ollamaService.chat(userMessage.content, chatMessages);
        
        const assistantMessage = {
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString()
        };

        setChatMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('❌ Error sending chat message:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please make sure Ollama is running on localhost:11434 and try again.',
        timestamp: new Date().toISOString(),
        isError: true
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  // Parse natural language rewrite requests
  const parseRewriteRequest = (input) => {
    const lowerInput = input.toLowerCase();
    
    // Patterns to detect rewrite requests
    const rewritePatterns = [
      /(?:rewrite|make|change)\s+slide\s+(\d+)\s+(?:to be\s+)?(?:more\s+)?(\w+)/i,
      /slide\s+(\d+)\s+(?:should be|to be|make it)\s+(?:more\s+)?(\w+)/i,
      /make\s+slide\s+(\d+)\s+(?:more\s+)?(\w+)/i,
      /(?:change|update)\s+slide\s+(\d+)\s+(?:to\s+)?(?:be\s+)?(?:more\s+)?(\w+)/i
    ];
    
    for (const pattern of rewritePatterns) {
      const match = input.match(pattern);
      if (match) {
        const slideNumber = parseInt(match[1]);
        const style = match[2].toLowerCase();
        
        // Validate slide number
        if (slideNumber > 0 && slideNumber <= (presentationDetails?.slides?.length || 0)) {
          // Map common style variations
          const styleMap = {
            'professional': 'professional',
            'formal': 'formal',
            'casual': 'casual',
            'friendly': 'casual',
            'engaging': 'engaging',
            'interesting': 'engaging',
            'concise': 'concise',
            'brief': 'concise',
            'short': 'concise',
            'detailed': 'detailed',
            'comprehensive': 'detailed'
          };
          
          const mappedStyle = styleMap[style] || style;
          
          return {
            slideNumber: slideNumber,
            slideIndex: slideNumber - 1,
            style: mappedStyle
          };
        }
      }
    }
    
    return null;
  };

  const rewriteSlideContent = async (slideIndex, instruction) => {
    if (!presentationDetails || !presentationDetails.slides) return;

    const slide = presentationDetails.slides[slideIndex];
    if (!slide) return;

    try {
      setChatLoading(true);
      
      // Add processing message to chat
      const processingMessage = {
        role: 'assistant',
        content: `🔄 Processing slide ${slideIndex + 1}... Rewriting text to be ${instruction} and applying changes to Google Slides...`,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, processingMessage]);
      
      // Extract original text for comparison
      const originalTexts = ollamaService.extractTextFromSlide(slide);
      console.log(`📝 Found ${originalTexts.length} text elements to rewrite in slide ${slideIndex + 1}`);
      
      // Extract and rewrite slide text
      const rewrittenElements = await ollamaService.rewriteSlideText(slide, instruction);
      
      if (rewrittenElements.length === 0) {
        throw new Error('No text elements found to rewrite');
      }

      console.log(`✏️ Rewritten ${rewrittenElements.length} text elements`);

      // Create batch update requests for the rewritten text
      const requests = [];
      rewrittenElements.forEach(element => {
        requests.push({
          deleteText: {
            objectId: element.objectId,
            textRange: { type: 'ALL' }
          }
        });
        requests.push({
          insertText: {
            objectId: element.objectId,
            text: element.rewrittenText,
            insertionIndex: 0
          }
        });
      });

      console.log(`🔄 Applying ${requests.length} changes to Google Slides...`);

      // Apply changes to Google Slides automatically
      const response = await window.gapi.client.slides.presentations.batchUpdate({
        presentationId: selectedPresentation.id,
        requests: requests
      });

      console.log('✅ Slide rewrite applied to Google Slides:', response);

      // Refresh presentation details to reflect changes
      const updatedResponse = await getPresentation(selectedPresentation.id);
      const updatedDetails = updatedResponse.result || updatedResponse;
      setPresentationDetails(updatedDetails);
      setOriginalJson(updatedDetails);
      setEditedJson(JSON.stringify(updatedDetails, null, 2));

      // Create detailed success message with before/after comparison
      let comparisonText = `✅ **Slide ${slideIndex + 1} Successfully Updated!**\n\n`;
      comparisonText += `🎯 **Style Applied**: ${instruction}\n`;
      comparisonText += `📝 **Text Elements Changed**: ${rewrittenElements.length}\n\n`;
      
      // Show before/after for first few elements
      rewrittenElements.slice(0, 2).forEach((element, idx) => {
        const originalElement = originalTexts.find(orig => orig.objectId === element.objectId);
        if (originalElement) {
          comparisonText += `**Text ${idx + 1}:**\n`;
          comparisonText += `Before: "${originalElement.text}"\n`;
          comparisonText += `After: "${element.rewrittenText}"\n\n`;
        }
      });

      if (rewrittenElements.length > 2) {
        comparisonText += `... and ${rewrittenElements.length - 2} more text elements updated.\n\n`;
      }

      comparisonText += `🔄 **Changes Applied**: Automatically updated in Google Slides and JSON editor\n`;
      comparisonText += `💾 **Auto-saved**: Changes saved to MCard database`;

      const successMessage = {
        role: 'assistant',
        content: comparisonText,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, successMessage]);

      // Also save the rewrite session to MCard
      await sendJsonEditorToMCard(originalJson, updatedDetails, [{
        type: 'ai_rewrite',
        slideIndex: slideIndex,
        instruction: instruction,
        elementsChanged: rewrittenElements.length,
        originalTexts: originalTexts.map(t => t.text),
        rewrittenTexts: rewrittenElements.map(e => e.rewrittenText)
      }]);

    } catch (error) {
      console.error('❌ Error rewriting slide content:', error);
      const errorMessage = {
        role: 'assistant',
        content: `❌ **Failed to rewrite slide ${slideIndex + 1}**\n\nError: ${error.message}\n\n💡 **Troubleshooting:**\n- Make sure Ollama is running on localhost:11434\n- Check that you're signed in to Google Slides\n- Verify the slide has text content to rewrite`,
        timestamp: new Date().toISOString(),
        isError: true
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const quickRewriteSlide = async (slideIndex, instruction) => {
    const userMessage = {
      role: 'user',
      content: `Rewrite slide ${slideIndex + 1} to be ${instruction}`,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, userMessage]);
    
    await rewriteSlideContent(slideIndex, instruction);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openPresentationViewer = (presentation) => {
    setSelectedPresentation(presentation);
    setShowViewer(true);
  };

  const closePresentationViewer = () => {
    setSelectedPresentation(null);
    setShowViewer(false);
  };

  const getEmbedUrl = (presentation) => {
    if (!presentation.webViewLink) return null;
    // Convert Google Slides view URL to embed URL
    const presentationId = presentation.id;
    return `https://docs.google.com/presentation/d/${presentationId}/embed?start=false&loop=false&delayms=3000`;
  };

  const openPresentationEditor = async (presentation) => {
    try {
      setEditorLoading(true);
      setError(null);
      setSelectedPresentation(presentation);
      setShowEditor(true);
      
      console.log('Loading presentation details for editing:', presentation.id);
      
      const response = await getPresentation(presentation.id);
      console.log('Presentation details loaded:', response);
      
      // Extract the actual presentation data from the API response
      const details = response.result || response;
      console.log('Extracted presentation details:', details);
      
      // Validate the details structure
      if (!details || !details.slides) {
        console.error('Invalid presentation data structure. Details:', details);
        throw new Error('Invalid presentation data structure');
      }
      
      setPresentationDetails(details);
      setOriginalJson(details);
      setEditedJson(JSON.stringify(details, null, 2));
      
      // Automatically save JSON data to MCard when editor is opened
      await autoSaveJsonToMCard(details, presentation);
      
    } catch (error) {
      console.error('Error loading presentation details:', error);
      setError('Failed to load presentation for editing: ' + (error.message || 'Unknown error'));
      setShowEditor(false);
      setSelectedPresentation(null);
    } finally {
      setEditorLoading(false);
    }
  };

  const closePresentationEditor = () => {
    setSelectedPresentation(null);
    setPresentationDetails(null);
    setShowEditor(false);
    setEditingSlide(null);
    setSlideContent('');
    setEditorLoading(false);
    setJsonEditorMode(false);
    setOriginalJson(null);
    setEditedJson('');
    setJsonChanges([]);
  };

  const handleCreatePresentation = async () => {
    try {
      setLoading(true);
      const title = prompt('Enter presentation title:', 'New Presentation');
      if (!title) return;
      
      const newPresentation = await createPresentation(title);
      await loadPresentations(); // Refresh the list
      setError(null);
    } catch (error) {
      console.error('Error creating presentation:', error);
      setError('Failed to create presentation');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlide = async () => {
    if (!selectedPresentation) return;
    
    try {
      setLoading(true);
      await addSlide(selectedPresentation.id);
      // Refresh presentation details
      const response = await getPresentation(selectedPresentation.id);
      const details = response.result || response;
      setPresentationDetails(details);
      setError(null);
    } catch (error) {
      console.error('Error adding slide:', error);
      setError('Failed to add slide');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSlide = (slide) => {
    setEditingSlide(slide);
    // Extract existing text content if available
    let existingText = '';
    if (slide?.pageElements) {
      const textElement = slide.pageElements.find(el => el?.shape?.text);
      if (textElement?.shape?.text?.textElements) {
        existingText = textElement.shape.text.textElements
          .map(el => el?.textRun?.content || '')
          .join('');
      }
    }
    setSlideContent(existingText);
  };

  const handleSaveSlideText = async () => {
    if (!selectedPresentation || !editingSlide) return;
    
    try {
      setLoading(true);
      await updateSlideText(selectedPresentation.id, editingSlide.objectId, slideContent);
      // Refresh presentation details
      const response = await getPresentation(selectedPresentation.id);
      const details = response.result || response;
      setPresentationDetails(details);
      setEditingSlide(null);
      setSlideContent('');
      setError(null);
    } catch (error) {
      console.error('Error updating slide text:', error);
      setError('Failed to update slide text');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTextBox = async (slide) => {
    if (!selectedPresentation) return;
    
    const text = prompt('Enter text for the text box:', 'New text box');
    if (!text) return;
    
    try {
      setLoading(true);
      await addTextBox(selectedPresentation.id, slide.objectId, text);
      // Refresh presentation details
      const response = await getPresentation(selectedPresentation.id);
      const details = response.result || response;
      setPresentationDetails(details);
      setError(null);
    } catch (error) {
      console.error('Error adding text box:', error);
      setError('Failed to add text box');
    } finally {
      setLoading(false);
    }
  };

  // JSON Editor Functions
  const toggleJsonEditor = () => {
    setJsonEditorMode(!jsonEditorMode);
    if (!jsonEditorMode && presentationDetails) {
      setEditedJson(JSON.stringify(presentationDetails, null, 2));
    }
  };

  const detectJsonChanges = (original, edited) => {
    try {
      const originalObj = typeof original === 'string' ? JSON.parse(original) : original;
      const editedObj = typeof edited === 'string' ? JSON.parse(edited) : edited;
      
      const changes = [];
      
      // Compare slides and their elements
      if (originalObj.slides && editedObj.slides) {
        editedObj.slides.forEach((editedSlide, slideIndex) => {
          const originalSlide = originalObj.slides[slideIndex];
          if (!originalSlide) return;
          
          // Compare page elements
          if (editedSlide.pageElements && originalSlide.pageElements) {
            editedSlide.pageElements.forEach((editedElement, elementIndex) => {
              const originalElement = originalSlide.pageElements[elementIndex];
              if (!originalElement) return;
              
              // Detect text style changes
              if (editedElement.shape?.text?.textElements && originalElement.shape?.text?.textElements) {
                editedElement.shape.text.textElements.forEach((editedTextElement, textIndex) => {
                  const originalTextElement = originalElement.shape.text.textElements[textIndex];
                  if (!originalTextElement || !editedTextElement.textRun || !originalTextElement.textRun) return;
                  
                  const editedStyle = editedTextElement.textRun.style || {};
                  const originalStyle = originalTextElement.textRun.style || {};
                  
                  // Check for content changes first (more important)
                  if (editedTextElement.textRun.content !== originalTextElement.textRun.content) {
                    changes.push({
                      type: 'replaceAllText',
                      objectId: editedElement.objectId,
                      newText: editedTextElement.textRun.content,
                      originalText: originalTextElement.textRun.content,
                      slideIndex,
                      elementIndex,
                      textIndex
                    });
                  }
                  
                  // Check for style changes (only if content didn't change to avoid conflicts)
                  else if (JSON.stringify(editedStyle) !== JSON.stringify(originalStyle)) {
                    changes.push({
                      type: 'updateTextStyle',
                      objectId: editedElement.objectId,
                      style: editedStyle,
                      originalStyle: originalStyle,
                      slideIndex,
                      elementIndex,
                      textIndex
                    });
                  }
                });
              }
            });
          }
        });
      }
      
      return changes;
    } catch (error) {
      console.error('Error detecting JSON changes:', error);
      return [];
    }
  };

  const generateBatchUpdateRequests = (changes) => {
    const requests = [];
    
    changes.forEach(change => {
      switch (change.type) {
        case 'updateTextStyle':
          // Determine which style fields changed
          const fields = [];
          const style = {};
          
          if (change.style.foregroundColor !== change.originalStyle.foregroundColor) {
            fields.push('foregroundColor');
            style.foregroundColor = change.style.foregroundColor;
          }
          
          if (change.style.fontSize !== change.originalStyle.fontSize) {
            fields.push('fontSize');
            style.fontSize = change.style.fontSize;
          }
          
          if (change.style.bold !== change.originalStyle.bold) {
            fields.push('bold');
            style.bold = change.style.bold;
          }
          
          if (change.style.italic !== change.originalStyle.italic) {
            fields.push('italic');
            style.italic = change.style.italic;
          }
          
          if (change.style.underline !== change.originalStyle.underline) {
            fields.push('underline');
            style.underline = change.style.underline;
          }
          
          if (fields.length > 0) {
            requests.push({
              updateTextStyle: {
                objectId: change.objectId,
                textRange: {
                  type: 'ALL'
                },
                style: style,
                fields: fields.join(',')
              }
            });
          }
          break;
          
        case 'replaceAllText':
          // Use deleteText and insertText for specific text elements
          requests.push({
            deleteText: {
              objectId: change.objectId,
              textRange: {
                type: 'ALL'
              }
            }
          });
          requests.push({
            insertText: {
              objectId: change.objectId,
              text: change.newText,
              insertionIndex: 0
            }
          });
          break;
      }
    });
    
    return requests;
  };

  const applyJsonChanges = async () => {
    try {
      setLoading(true);
      
      // Parse the edited JSON
      const editedData = JSON.parse(editedJson);
      
      // Detect changes
      const changes = detectJsonChanges(originalJson, editedData);
      console.log('Detected changes:', changes);
      
      if (changes.length === 0) {
        setError('No changes detected in the JSON');
        return;
      }
      
      // Generate batch update requests
      const requests = generateBatchUpdateRequests(changes);
      console.log('Generated batch update requests:', requests);
      
      if (requests.length === 0) {
        setError('No valid update requests could be generated from the changes');
        return;
      }
      
      // Apply changes via Google Slides API
      console.log('Sending batch update with requests:', JSON.stringify(requests, null, 2));
      
      const response = await window.gapi.client.slides.presentations.batchUpdate({
        presentationId: selectedPresentation.id,
        requests: requests
      });
      
      console.log('Batch update response:', response);
      
      // Refresh presentation details
      const updatedResponse = await getPresentation(selectedPresentation.id);
      const updatedDetails = updatedResponse.result || updatedResponse;
      setPresentationDetails(updatedDetails);
      setOriginalJson(updatedDetails);
      setEditedJson(JSON.stringify(updatedDetails, null, 2));
      setJsonChanges([]);
      
      setError(null);
      
      // Save JSON editor session to MCard
      await sendJsonEditorToMCard(originalJson, editedData, changes);
      
      alert(`Successfully applied ${requests.length} changes to the presentation and saved to MCard!`);
      
    } catch (error) {
      console.error('Error applying JSON changes:', error);
      
      let errorMessage = 'Failed to apply JSON changes: ';
      if (error.result?.error?.message) {
        errorMessage += error.result.error.message;
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Unknown error';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlide = async (slide) => {
    if (!selectedPresentation || !presentationDetails) return;
    
    // Don't allow deleting the last slide
    if ((presentationDetails?.slides?.length || 0) <= 1) {
      setError('Cannot delete the last slide in the presentation');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this slide?')) return;
    
    try {
      setLoading(true);
      await deleteSlide(selectedPresentation.id, slide.objectId);
      // Refresh presentation details
      const response = await getPresentation(selectedPresentation.id);
      const details = response.result || response;
      setPresentationDetails(details);
      setError(null);
    } catch (error) {
      console.error('Error deleting slide:', error);
      setError('Failed to delete slide');
    } finally {
      setLoading(false);
    }
  };

  const renderMCardSyncStatus = () => {
    if (!mcardSyncStatus) return null;

    let statusClass = '';
    let statusContent = '';
    
    if (mcardSyncStatus === 'syncing') {
      statusClass = 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      statusContent = (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-600 border-t-transparent"></div>
          <span>Syncing presentations to MCard...</span>
        </div>
      );
    } else if (mcardSyncStatus === 'success') {
      statusClass = 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      statusContent = (
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>Presentations successfully saved to MCard!</span>
        </div>
      );
    } else if (mcardSyncStatus === 'error') {
      statusClass = 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      statusContent = (
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>Failed to sync to MCard: {mcardSyncError}</span>
        </div>
      );
    }
    
    return (
      <div className={`rounded-lg p-3 text-sm ${statusClass}`}>
        {statusContent}
      </div>
    );
  };

  const renderJsonEditorSyncStatus = () => {
    if (!jsonEditorSyncStatus) return null;

    let statusClass = '';
    let statusContent = '';
    
    if (jsonEditorSyncStatus === 'syncing') {
      statusClass = 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      statusContent = (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
          <span>Auto-saving JSON data to MCard...</span>
        </div>
      );
    } else if (jsonEditorSyncStatus === 'success') {
      statusClass = 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      statusContent = (
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>JSON data automatically saved to MCard!</span>
        </div>
      );
    } else if (jsonEditorSyncStatus === 'error') {
      statusClass = 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      statusContent = (
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>Failed to save JSON editor session to MCard</span>
        </div>
      );
    }
    
    return (
      <div className={`rounded-lg p-3 text-sm ${statusClass}`}>
        {statusContent}
      </div>
    );
  };

  if (loading && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm opacity-70">Loading Google Slides...</p>
        </div>
      </div>
    );
  }

  if (error && !isAuthenticated) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg p-4 text-center">
        <div className="text-4xl mb-2">⚠️</div>
        <p className="text-sm">{error}</p>
        <button 
          onClick={initializeGoogleSlides}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <div className="h-full p-4 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold dark:text-white">Google Slides</h2>
          <button 
            onClick={isAuthenticated ? handleSignOut : handleSignIn}
            disabled={loading}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              isAuthenticated 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <img 
              src="https://www.google.com/favicon.ico" 
              alt="Google" 
              className="w-4 h-4"
            />
            <span>{isAuthenticated ? 'Sign Out' : 'Sign in with Google'}</span>
          </button>
        </div>

        {/* MCard Sync Status */}
        {renderMCardSyncStatus()}

        {/* Content */}
        {isAuthenticated ? (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg p-3">
              <h3 className="font-semibold mb-2">Your Presentations</h3>
              <p className="text-sm">
                {presentations && presentations.length > 0 
                  ? `You have ${presentations.length} presentation${presentations.length === 1 ? '' : 's'} in Google Slides`
                  : 'No presentations found. Create your first presentation in Google Slides!'
                }
              </p>
            </div>

            {/* Presentations List */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold dark:text-white">Recent Presentations</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={handleCreatePresentation}
                    disabled={loading}
                    className="px-3 py-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    New
                  </button>
                  <button 
                    onClick={loadPresentations}
                    disabled={loading}
                    className="px-3 py-1 text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-sm opacity-70">Loading presentations...</p>
                    </div>
                  </div>
                ) : !presentations || presentations.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📊</div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">No presentations found</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Create a new presentation in Google Slides to get started
                    </p>
                  </div>
                ) : (
                  (presentations || []).map((presentation) => (
                    <div 
                      key={presentation.id} 
                      className="bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        {/* Thumbnail */}
                        <div className="flex-shrink-0">
                          {presentation.thumbnailLink ? (
                            <img 
                              src={presentation.thumbnailLink} 
                              alt={presentation.name}
                              className="w-12 h-9 object-cover rounded border border-gray-200 dark:border-gray-600"
                            />
                          ) : (
                            <div className="w-12 h-9 bg-gray-100 dark:bg-gray-600 rounded border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm dark:text-white truncate">
                            {presentation.name || 'Untitled Presentation'}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Modified: {formatDate(presentation.modifiedTime)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex-shrink-0 flex gap-2">
                          <button
                            onClick={() => openPresentationViewer(presentation)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            title="View presentation"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openPresentationEditor(presentation)}
                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-sm p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                            title="Edit presentation"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <a
                            href={presentation.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                            title="Open in Google Slides"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-semibold dark:text-white mb-2">Access Your Google Slides</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Sign in with Google to view and manage your presentations
            </p>
            <button 
              onClick={handleSignIn}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Get Started
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && isAuthenticated && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {/* Presentation Viewer Modal */}
        {showViewer && selectedPresentation && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
            onClick={closePresentationViewer}
          >
            <div 
              className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {selectedPresentation.name || 'Untitled Presentation'}
                </h3>
                <div className="flex items-center gap-2">
                  <a
                    href={selectedPresentation.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Open in Google Slides
                  </a>
                  <button
                    onClick={closePresentationViewer}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 p-4" style={{ height: 'calc(100% - 80px)' }}>
                <iframe
                  src={getEmbedUrl(selectedPresentation)}
                  className="w-full h-full rounded border border-gray-200 dark:border-gray-600"
                  frameBorder="0"
                  allowFullScreen
                  title={selectedPresentation.name || 'Google Slides Presentation'}
                />
              </div>
            </div>
          </div>
        )}

        {/* Presentation Editor Modal */}
        {showEditor && selectedPresentation && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
            onClick={closePresentationEditor}
          >
            <div 
              className="relative w-full h-full max-w-7xl max-h-[95vh] m-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Editor Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  Edit: {selectedPresentation.name || 'Untitled Presentation'}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleJsonEditor}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      jsonEditorMode 
                        ? 'bg-purple-600 text-white hover:bg-purple-700' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500'
                    }`}
                  >
                    {jsonEditorMode ? 'Visual Editor' : 'JSON Editor'}
                  </button>
                  {ollamaAvailable && (
                    <button
                      onClick={toggleChatbot}
                      className={`px-3 py-1 text-sm rounded transition-colors flex items-center gap-2 ${
                        showChatbot 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      AI Assistant
                    </button>
                  )}
                  <button
                    onClick={handleAddSlide}
                    disabled={loading || editorLoading}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Add Slide
                  </button>
                  <a
                    href={selectedPresentation.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Open in Google Slides
                  </a>
                  <button
                    onClick={closePresentationEditor}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Editor Content */}
              <div className="flex h-full" style={{ height: 'calc(100% - 80px)' }}>
                {editorLoading || !presentationDetails ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">Loading presentation...</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Please wait while we fetch the presentation details</p>
                    </div>
                  </div>
                ) : jsonEditorMode ? (
                  /* JSON Editor Mode */
                  <div className="flex h-full">
                    {/* JSON Editor */}
                    <div className={`${showChatbot ? 'w-1/2' : 'w-2/3'} p-4 border-r border-gray-200 dark:border-gray-600`}>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white">JSON Editor</h4>
                        <div className="flex gap-2">
                          <button
                            onClick={applyJsonChanges}
                            disabled={loading}
                            className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
                          >
                            Apply Changes
                          </button>
                          <button
                            onClick={() => {
                              if (presentationDetails) {
                                setEditedJson(JSON.stringify(presentationDetails, null, 2));
                                setJsonChanges([]);
                              }
                            }}
                            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                      
                      {/* JSON Editor MCard Sync Status */}
                      {renderJsonEditorSyncStatus()}
                      <textarea
                        value={editedJson}
                        onChange={(e) => {
                          setEditedJson(e.target.value);
                          // Detect changes in real-time
                          try {
                            const changes = detectJsonChanges(originalJson, e.target.value);
                            setJsonChanges(changes);
                          } catch (error) {
                            // Invalid JSON, ignore for now
                          }
                        }}
                        className="w-full h-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Loading presentation JSON..."
                        style={{ minHeight: '500px' }}
                      />
                    </div>
                    
                    {/* Chatbot Panel */}
                    {showChatbot && (
                      <div className="w-1/3 p-4 border-r border-gray-200 dark:border-gray-600 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            AI Assistant
                          </h4>
                          <div className="flex gap-2">
                            {presentationDetails?.slides && (
                              <select
                                value={selectedSlideForRewrite || ''}
                                onChange={(e) => setSelectedSlideForRewrite(e.target.value ? parseInt(e.target.value) : null)}
                                className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              >
                                <option value="">Select Slide</option>
                                {presentationDetails.slides.map((_, index) => (
                                  <option key={index} value={index}>Slide {index + 1}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                        
                        {/* Quick Actions */}
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick Rewrite:</p>
                          <div className="flex flex-wrap gap-1">
                            {['formal', 'casual', 'professional', 'engaging', 'concise'].map((style) => (
                              <button
                                key={style}
                                onClick={() => selectedSlideForRewrite !== null && quickRewriteSlide(selectedSlideForRewrite, style)}
                                disabled={selectedSlideForRewrite === null || chatLoading}
                                className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {style}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto mb-4 space-y-2 max-h-64">
                          {chatMessages.map((message, index) => (
                            <div key={index} className={`p-2 rounded-lg text-sm ${
                              message.role === 'user' 
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 ml-4' 
                                : message.isError
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100 mr-4'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 mr-4'
                            }`}>
                              <div className="font-medium text-xs opacity-70 mb-1">
                                {message.role === 'user' ? 'You' : 'AI Assistant'}
                              </div>
                              <div className="whitespace-pre-wrap">{message.content}</div>
                            </div>
                          ))}
                          {chatLoading && (
                            <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 mr-4 p-2 rounded-lg text-sm">
                              <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-600 border-t-transparent"></div>
                                <span>AI is thinking...</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Chat Input */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                            placeholder="Ask AI to rewrite or help with slides..."
                            className="flex-1 text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={chatLoading}
                          />
                          <button
                            onClick={sendChatMessage}
                            disabled={!chatInput.trim() || chatLoading}
                            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Changes Preview */}
                    <div className={`${showChatbot ? 'w-1/6' : 'w-1/3'} p-4 overflow-y-auto`}>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                        Detected Changes ({jsonChanges.length})
                      </h4>
                      {jsonChanges.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="text-4xl mb-2">📝</div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">No changes detected</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Edit the JSON to see changes here
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {jsonChanges.map((change, index) => (
                            <div key={index} className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-medium px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded">
                                  {change.type}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Slide {change.slideIndex + 1}
                                </span>
                              </div>
                              <div className="text-sm text-gray-700 dark:text-gray-300">
                                {change.type === 'updateTextStyle' && (
                                  <div>
                                    <p className="font-medium">Style changes:</p>
                                    <pre className="text-xs mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto">
                                      {JSON.stringify(change.style, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {change.type === 'replaceAllText' && (
                                  <div>
                                    <p className="font-medium">Text change:</p>
                                    <p className="text-xs mt-1">
                                      <span className="text-red-600 dark:text-red-400">- {change.originalText}</span><br/>
                                      <span className="text-green-600 dark:text-green-400">+ {change.newText}</span>
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Slides Panel */}
                    <div className="w-1/3 border-r border-gray-200 dark:border-gray-600 p-4 overflow-y-auto">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Slides</h4>
                      <div className="space-y-2">
                        {(presentationDetails?.slides || []).map((slide, index) => (
                      <div 
                        key={slide.objectId}
                        className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            Slide {index + 1}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditSlide(slide)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1 rounded"
                              title="Edit text"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {ollamaAvailable && (
                              <div className="relative group">
                                <button
                                  className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 p-1 rounded"
                                  title="AI Rewrite"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                  </svg>
                                </button>
                                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 min-w-max">
                                  <div className="flex gap-1">
                                    {['formal', 'casual', 'engaging'].map((style) => (
                                      <button
                                        key={style}
                                        onClick={() => quickRewriteSlide(index, style)}
                                        disabled={chatLoading}
                                        className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 disabled:opacity-50"
                                      >
                                        {style}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                            <button
                              onClick={() => handleAddTextBox(slide)}
                              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-1 rounded"
                              title="Add text box"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                              </svg>
                            </button>
                            {(presentationDetails?.slides?.length || 0) > 1 && (
                              <button
                                onClick={() => handleDeleteSlide(slide)}
                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1 rounded"
                                title="Delete slide"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {slide?.pageElements ? `${slide.pageElements.length} elements` : 'Empty slide'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Edit Panel */}
                <div className="flex-1 p-4">
                  {editingSlide ? (
                    <div className="h-full flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          Edit Slide Text
                        </h4>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveSlideText}
                            disabled={loading}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingSlide(null);
                              setSlideContent('');
                            }}
                            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={slideContent}
                        onChange={(e) => setSlideContent(e.target.value)}
                        className="flex-1 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter slide text content..."
                      />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <p className="text-lg font-medium mb-2">Select a slide to edit</p>
                        <p className="text-sm">Click the edit button on any slide to modify its content</p>
                      </div>
                    </div>
                  )}
                </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleSlides;
