// Google Docs API integration with runtime environment support
// This module handles Google Docs authentication, document selection, and content processing

import { getGoogleCredentials } from '../../utils/runtime-env.ts';

class GoogleDocsService {
  constructor() {
    this.gapiInited = false;
    this.gisInited = false;
    this.tokenClient = null;
    this.credentials = null;
    this.SCOPES = 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.readonly';
    
    // Initialize credentials from runtime environment
    this.initializeCredentials();
    
    // Listen for runtime environment changes
    if (typeof window !== 'undefined') {
      window.addEventListener('runtime-env-changed', () => {
        console.log('🔄 Google Docs: Runtime environment changed, refreshing credentials...');
        this.initializeCredentials();
      });
    }
  }

  initializeCredentials() {
    this.credentials = getGoogleCredentials();
    console.log('🔑 Google Docs credentials loaded:', {
      hasApiKey: this.credentials?.hasApiKey || false,
      hasClientId: this.credentials?.hasClientId || false,
      hasClientSecret: this.credentials?.hasClientSecret || false,
      isValid: this.credentials?.isValid || false
    });
  }

  // Load Google API scripts
  async loadGoogleAPIs() {
    return new Promise((resolve, reject) => {
      try {
        // Load Google Identity Services (GIS)
        const gisScript = document.createElement('script');
        gisScript.src = 'https://accounts.google.com/gsi/client';
        gisScript.async = true;
        gisScript.defer = true;
        gisScript.onload = () => {
          console.log('✅ Google Identity Services loaded');
          this.gisInited = true;
          this.checkInitialization(resolve);
        };
        gisScript.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        
        // Load Google API Client
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.onload = () => {
          console.log('✅ Google API Client loaded');
          this.initializeGapiClient().then(() => {
            this.gapiInited = true;
            this.checkInitialization(resolve);
          }).catch(reject);
        };
        gapiScript.onerror = () => reject(new Error('Failed to load Google API Client'));
        
        document.head.appendChild(gisScript);
        document.head.appendChild(gapiScript);
      } catch (error) {
        reject(error);
      }
    });
  }

  checkInitialization(resolve) {
    if (this.gapiInited && this.gisInited) {
      console.log('✅ Google Docs APIs fully initialized');
      resolve();
    }
  }

  // Initialize GAPI client
  async initializeGapiClient() {
    if (!this.credentials?.apiKey) {
      throw new Error('Google API key not available');
    }

    return new Promise((resolve, reject) => {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: this.credentials.apiKey,
            discoveryDocs: ["https://docs.googleapis.com/$discovery/rest?version=v1"],
          });
          console.log('✅ GAPI client initialized');
          resolve();
        } catch (error) {
          console.error('❌ Error initializing GAPI client:', error);
          reject(error);
        }
      });
    });
  }

  // Authenticate with Google
  async authenticate() {
    if (!this.credentials?.isValid) {
      throw new Error('Invalid Google credentials. Please check your configuration.');
    }

    if (!window.google?.accounts?.oauth2) {
      throw new Error('Google Identity Services not loaded');
    }

    return new Promise((resolve, reject) => {
      try {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.credentials.clientId,
          scope: this.SCOPES,
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              console.error('❌ OAuth error:', tokenResponse.error);
              reject(new Error(`Authentication failed: ${tokenResponse.error}`));
              return;
            }

            try {
              await window.gapi.client.setToken(tokenResponse);
              console.log('✅ Google Docs authentication successful');
              resolve(tokenResponse);
            } catch (error) {
              console.error('❌ Error setting token:', error);
              reject(new Error('Failed to set authentication token'));
            }
          },
          error_callback: (error) => {
            console.error('❌ Authentication error:', error);
            reject(new Error(`Authentication error: ${error.type || 'Unknown error'}`));
          }
        });
        
        this.tokenClient.requestAccessToken();
      } catch (error) {
        console.error('❌ Error creating token client:', error);
        reject(new Error('Failed to create authentication client'));
      }
    });
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!(window.gapi?.client?.getToken());
  }

  // Get document content using Google Docs API
  async getDocument(documentId) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please sign in first.');
    }

    try {
      const response = await window.gapi.client.docs.documents.get({
        documentId: documentId
      });

      if (response.status === 200) {
        return response.result;
      } else {
        throw new Error(`Failed to fetch document: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error fetching document:', error);
      throw new Error(`Failed to fetch document: ${error.message}`);
    }
  }

  // Convert Google Docs document to Markdown
  convertDocToMarkdown(doc) {
    let markdown = '';
    const content = doc.body?.content || [];

    content.forEach(element => {
      if (element.paragraph) {
        const paragraph = element.paragraph;
        let text = '';
        
        paragraph.elements?.forEach(elem => {
          if (elem.textRun) {
            const style = elem.textRun.textStyle || {};
            let formattedText = elem.textRun.content || '';

            // Apply formatting
            if (style.bold) formattedText = `**${formattedText}**`;
            if (style.italic) formattedText = `*${formattedText}*`;
            if (style.underline) formattedText = `<u>${formattedText}</u>`;
            if (style.strikethrough) formattedText = `~~${formattedText}~~`;
            
            text += formattedText;
          }
        });

        // Handle different paragraph styles
        const namedStyle = paragraph.paragraphStyle?.namedStyleType;
        if (namedStyle?.includes('HEADING')) {
          const level = parseInt(namedStyle.slice(-1)) || 1;
          text = '#'.repeat(level) + ' ' + text.trim();
        }

        markdown += text + '\n';
      } else if (element.table) {
        // Handle tables
        markdown += this.convertTableToMarkdown(element.table);
      }
    });

    return markdown.trim();
  }

  // Convert table to Markdown format
  convertTableToMarkdown(table) {
    let markdown = '\n';
    const rows = table.tableRows || [];
    
    rows.forEach((row, rowIndex) => {
      const cells = row.tableCells || [];
      const cellTexts = cells.map(cell => {
        let cellText = '';
        cell.content?.forEach(element => {
          if (element.paragraph) {
            element.paragraph.elements?.forEach(elem => {
              if (elem.textRun) {
                cellText += elem.textRun.content || '';
              }
            });
          }
        });
        return cellText.trim();
      });
      
      markdown += '| ' + cellTexts.join(' | ') + ' |\n';
      
      // Add header separator after first row
      if (rowIndex === 0) {
        markdown += '| ' + cellTexts.map(() => '---').join(' | ') + ' |\n';
      }
    });
    
    return markdown + '\n';
  }

  // Extract document ID from Google Docs URL
  extractDocIdFromUrl(url) {
    try {
      const regex = /\/document\/d\/([a-zA-Z0-9-_]+)/;
      const match = url.match(regex);
      return match ? match[1] : null;
    } catch (error) {
      console.error('❌ Error extracting document ID:', error);
      return null;
    }
  }

  // Export document as Markdown file
  async exportAsMarkdown(documentId, filename = null) {
    try {
      const doc = await this.getDocument(documentId);
      const markdown = this.convertDocToMarkdown(doc);
      
      // Create filename if not provided
      const docTitle = doc.title || 'document';
      const finalFilename = filename || `${docTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
      
      // Create and download file
      this.downloadAsFile(markdown, finalFilename, 'text/markdown');
      
      return { success: true, markdown, filename: finalFilename };
    } catch (error) {
      console.error('❌ Export failed:', error);
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  // Download content as file
  downloadAsFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    URL.revokeObjectURL(url);
  }

  // Get credentials status
  getCredentialsStatus() {
    return {
      loaded: !!this.credentials,
      valid: this.credentials?.isValid || false,
      hasApiKey: this.credentials?.hasApiKey || false,
      hasClientId: this.credentials?.hasClientId || false,
      hasClientSecret: this.credentials?.hasClientSecret || false
    };
  }

  // Validate credentials
  validateCredentials() {
    const status = this.getCredentialsStatus();
    if (!status.valid) {
      const missing = [];
      if (!status.hasApiKey) missing.push('API Key');
      if (!status.hasClientId) missing.push('Client ID');
      if (!status.hasClientSecret) missing.push('Client Secret');
      
      throw new Error(`Missing Google Docs credentials: ${missing.join(', ')}`);
    }
    return true;
  }
}

// Export singleton instance
export const googleDocsService = new GoogleDocsService();

// Export individual functions for convenience
export const {
  loadGoogleAPIs,
  authenticate,
  isAuthenticated,
  getDocument,
  convertDocToMarkdown,
  extractDocIdFromUrl,
  exportAsMarkdown,
  getCredentialsStatus,
  validateCredentials
} = googleDocsService;

export default googleDocsService;
