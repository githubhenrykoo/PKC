import React, { useState, useEffect, useCallback } from 'react';

// Dynamic credentials from runtime environment
let NOTION_CLIENT_ID = '';
let NOTION_CLIENT_SECRET = '';
let NOTION_AUTH_URL = '';

// Add the extractTitle helper function
const extractTitle = (page) => {
  if (page.properties && page.properties.title) {
    const titleProperty = page.properties.title;
    if (Array.isArray(titleProperty.title)) {
      return titleProperty.title.map(t => t.plain_text).join('');
    }
  }
  return page.id;
};

const NotionPanel = ({ className = '' }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pageId, setPageId] = useState(''); // Default page ID
  const [connected, setConnected] = useState(false); // Default to false until authenticated
  const [accessToken, setAccessToken] = useState(null);
  const [workspaceName, setWorkspaceName] = useState('');
  
  // Credential management state
  const [credentials, setCredentials] = useState({
    CLIENT_ID: '',
    CLIENT_SECRET: '',
    AUTH_URL: ''
  });
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);
  const [credentialsError, setCredentialsError] = useState(null);

  // Function to fetch credentials from runtime environment
  const fetchRuntimeCredentials = useCallback(async () => {
    try {
      const timestamp = Date.now();
      const response = await fetch(`/runtime-env.json?t=${timestamp}`, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const env = await response.json();
        const newCredentials = {
          CLIENT_ID: env.PUBLIC_NOTION_CLIENT_ID || '',
          CLIENT_SECRET: env.PUBLIC_NOTION_CLIENT_SECRET || '',
          AUTH_URL: env.PUBLIC_NOTION_AUTH_URL || ''
        };
        
        // Update global variables for backward compatibility
        NOTION_CLIENT_ID = newCredentials.CLIENT_ID;
        NOTION_CLIENT_SECRET = newCredentials.CLIENT_SECRET;
        NOTION_AUTH_URL = newCredentials.AUTH_URL;
        
        setCredentials(newCredentials);
        setCredentialsLoaded(true);
        setCredentialsError(null);
        
        console.log('🔑 Notion credentials updated from runtime environment:', {
          hasClientId: !!newCredentials.CLIENT_ID,
          hasClientSecret: !!newCredentials.CLIENT_SECRET,
          hasAuthUrl: !!newCredentials.AUTH_URL,
          timestamp: new Date().toISOString()
        });
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('notion-credentials-updated', {
          detail: { credentials: newCredentials, timestamp: new Date().toISOString() }
        }));
        
        return newCredentials;
      } else {
        throw new Error(`Failed to fetch runtime environment: ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch runtime credentials, using fallback:', error);
      
      // Fallback to build-time environment variables
      const fallbackCredentials = {
        CLIENT_ID: import.meta.env.PUBLIC_NOTION_CLIENT_ID || '',
        CLIENT_SECRET: import.meta.env.PUBLIC_NOTION_CLIENT_SECRET || '',
        AUTH_URL: import.meta.env.PUBLIC_NOTION_AUTH_URL || ''
      };
      
      NOTION_CLIENT_ID = fallbackCredentials.CLIENT_ID;
      NOTION_CLIENT_SECRET = fallbackCredentials.CLIENT_SECRET;
      NOTION_AUTH_URL = fallbackCredentials.AUTH_URL;
      
      setCredentials(fallbackCredentials);
      setCredentialsLoaded(true);
      setCredentialsError(error.message);
      
      return fallbackCredentials;
    }
  }, []);

  // Validate credentials
  const validateCredentials = useCallback((creds) => {
    const missing = [];
    if (!creds.CLIENT_ID) missing.push('CLIENT_ID');
    if (!creds.CLIENT_SECRET) missing.push('CLIENT_SECRET');
    if (!creds.AUTH_URL) missing.push('AUTH_URL');
    
    return {
      isValid: missing.length === 0,
      missing,
      message: missing.length > 0 
        ? `Missing Notion credentials: ${missing.join(', ')}. Please check your environment variables.`
        : 'All Notion credentials are valid'
    };
  }, []);

  // Initialize credentials on component mount
  useEffect(() => {
    fetchRuntimeCredentials();
  }, [fetchRuntimeCredentials]);

  // Listen for runtime environment changes (moved after handleLogout definition)
  // This will be added after the handleLogout function

  // Check for existing token and listen for OAuth success
  useEffect(() => {
    const savedToken = localStorage.getItem('notion_access_token');
    if (savedToken) {
      const savedWorkspaceName = localStorage.getItem('notion_workspace_name');
      setAccessToken(savedToken);
      setWorkspaceName(savedWorkspaceName || '');
      setConnected(true);
      console.log('Restored previous Notion session');
    }

    // Listen for OAuth success messages from popup window
    const handleMessage = (event) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'notion-auth-success') {
        const { access_token, workspace_name, workspace_id, bot_id } = event.data.data;
        
        // Store tokens
        localStorage.setItem('notion_access_token', access_token);
        localStorage.setItem('notion_workspace_name', workspace_name || '');
        localStorage.setItem('notion_workspace_id', workspace_id || '');
        localStorage.setItem('notion_bot_id', bot_id || '');
        
        // Update component state
        setAccessToken(access_token);
        setWorkspaceName(workspace_name || '');
        setConnected(true);
        setError(null);
        
        console.log('Notion OAuth success:', { workspace_name, workspace_id });
      } else if (event.data.type === 'notion-auth-error') {
        setError(`Authentication failed: ${event.data.error}`);
        console.error('Notion OAuth error:', event.data.error);
      }
    };

    // Listen for OAuth success event (legacy)
    const handleNotionConnected = (event) => {
      const { accessToken, workspaceId, workspaceName } = event.detail;
      setAccessToken(accessToken);
      setWorkspaceName(workspaceName);
      setConnected(true);
      console.log('Notion connected via OAuth');
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('notionConnected', handleNotionConnected);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('notionConnected', handleNotionConnected);
    };
  }, []);

  // Auto-sync when pageId changes and we're connected
  useEffect(() => {
    if (pageId && connected) {
      syncPage(pageId);
    }
  }, [pageId, connected]);



  const handleLogin = async () => {
    try {
      // Ensure credentials are loaded
      if (!credentialsLoaded) {
        await fetchRuntimeCredentials();
      }

      // Validate credentials
      const validation = validateCredentials(credentials);
      if (!validation.isValid) {
        throw new Error(validation.message);
      }

      const { CLIENT_ID, AUTH_URL } = credentials;
      
      // Build OAuth URL dynamically
      const redirectUri = `${window.location.origin}/auth/notion/callback`;
      const state = Math.random().toString(36).substring(2, 15);
      
      const oauthUrl = AUTH_URL || `https://api.notion.com/v1/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
      
      console.log('Opening OAuth window with URL:', oauthUrl);
      
      // Open OAuth window
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        oauthUrl,
        'notion-oauth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );
      
      if (!popup) {
        throw new Error('Failed to open OAuth popup. Please check your popup blocker settings.');
      }
      
      // Optional: Monitor popup for closure without success
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          console.log('OAuth popup was closed');
        }
      }, 1000);
      
    } catch (error) {
      console.error('OAuth initialization error:', error);
      setError(`Failed to start OAuth: ${error.message}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('notion_access_token');
    localStorage.removeItem('notion_workspace_id');
    localStorage.removeItem('notion_workspace_name');
    
    setAccessToken(null);
    setConnected(false);
    setDocuments([]);
    setError(null);
  };

  // Listen for runtime environment changes
  useEffect(() => {
    const handleRuntimeEnvChange = async () => {
      console.log('🔄 Runtime environment changed, refreshing Notion credentials...');
      const oldCredentials = { ...credentials };
      const newCredentials = await fetchRuntimeCredentials();
      
      // If credentials changed significantly, reset connection
      if (connected && (
        oldCredentials.CLIENT_ID !== newCredentials.CLIENT_ID ||
        oldCredentials.CLIENT_SECRET !== newCredentials.CLIENT_SECRET
      )) {
        console.log('🔄 Notion credentials changed, requiring re-authentication');
        handleLogout();
        setError('Credentials have been updated. Please reconnect to Notion.');
      }
    };

    window.addEventListener('runtime-env-changed', handleRuntimeEnvChange);
    
    return () => {
      window.removeEventListener('runtime-env-changed', handleRuntimeEnvChange);
    };
  }, [fetchRuntimeCredentials, credentials, connected, handleLogout]);

  const uploadToCardCollection = async (notionData) => {
    try {
      // Convert the Notion data to raw format
      const contentData = notionData.map(doc => {
        let rawContent = `Title: ${doc.title}\n\n`;
        
        // Add tables
        if (doc.tables?.length > 0) {
          rawContent += 'Tables:\n';
          doc.tables.forEach(table => {
            table.rows.forEach(row => {
              rawContent += row.cells.join(' | ') + '\n';
            });
            rawContent += '\n';
          });
        }
      
        // Add descriptions
        if (doc.descriptions?.length > 0) {
          rawContent += 'Descriptions:\n';
          doc.descriptions.forEach(desc => {
            rawContent += `${desc.content}\n`;
          });
          rawContent += '\n';
        }
      
        // Add subheadings
        if (doc.subheadings?.length > 0) {
          rawContent += 'Subheadings:\n';
          doc.subheadings.forEach(heading => {
            rawContent += `${'#'.repeat(heading.level)} ${heading.content}\n`;
          });
        }
      
        return rawContent;
      }).join('\n---\n');
    
      await fetch('http://localhost:4321/api/card-collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: "add",
          card: {
            content: {
              dimensionType: "abstractSpecification",
              context: contentData,
              goal: "",
              successCriteria: ""
            }
          }
        })
      });
    
      return true;
    } catch (err) {
      console.error('Upload error:', err);
      return false;
    }
  };

  const syncDatabase = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notion/database?accessToken=${accessToken}`);
      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.documents);
        await uploadToCardCollection(data.documents);
      }
    } catch (err) {
      console.error('Sync error:', err);
      setError('Failed to sync database. Please check your connection and API key.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Daftarkan service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered:', registration);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

  const syncPage = async (pageId) => {
    if (!pageId.trim()) {
      setError('Please enter a valid page ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Tampilkan data dari cache terlebih dahulu jika ada
      const cachedData = await getCachedPage(pageId);
      if (cachedData) {
        setDocuments(prev => {
          const exists = prev.find(doc => doc.id === cachedData.id);
          if (!exists) {
            return [...prev, cachedData];
          }
          return prev;
        });
      }

      // Get fresh data from Notion through our API endpoint
      const response = await fetch(`/api/notion/getpage?pageId=${pageId}&accessToken=${accessToken}`);
      const data = await response.json();
      
      if (data.success) {
        const formattedDoc = {
          id: data.document.page.id,
          title: extractTitle(data.document.page),
          tables: data.document.tables,
          descriptions: data.document.descriptions,
          subheadings: data.document.subheadings,
          lastEdited: data.document.page.last_edited_time
        };

        setDocuments(prev => {
          const filtered = prev.filter(doc => doc.id !== formattedDoc.id);
          return [...filtered, formattedDoc];
        });
        
        await uploadToCardCollection([formattedDoc]);
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Sync error:', err);
      setError(err.message || 'Failed to fetch data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const getCachedPage = async (pageId) => {
    try {
      const cache = await caches.open('notion-cache-v2');
      const cachedResponse = await cache.match(`notion-page-${pageId}`);
      
      if (cachedResponse) {
        const data = await cachedResponse.json();
        if (data.success) {
          return {
            id: data.document.page.id,
            title: extractTitle(data.document.page),
            tables: data.document.tables,
            descriptions: data.document.descriptions,
            subheadings: data.document.subheadings,
            lastEdited: data.document.page.last_edited_time
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  };

  return (
    <div className={`notion-panel ${className}`} style={{ 
      padding: '20px', 
      backgroundColor: 'white', 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      ...(!connected ? {
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '300px' // Keep centered for login
      } : {
        // Full size for content when connected
        minHeight: '100%',
        overflow: 'auto'
      })
    }}>
      <div className="controls">
        {!connected ? (
          <div>
            <button
              onClick={handleLogin}
              disabled={!credentialsLoaded || !validateCredentials(credentials).isValid}
              className="connect-button"
              style={{
                padding: '10px 20px',
                backgroundColor: (!credentialsLoaded || !validateCredentials(credentials).isValid) ? '#ccc' : '#000',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: (!credentialsLoaded || !validateCredentials(credentials).isValid) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {!credentialsLoaded ? 'Loading credentials...' : 'Connect to Notion'}
            </button>
            
            {/* Show credential errors */}
            {credentialsLoaded && !validateCredentials(credentials).isValid && (
              <div style={{
                marginTop: '8px',
                padding: '8px',
                backgroundColor: '#fee',
                border: '1px solid #fcc',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#c33'
              }}>
                ⚠️ {validateCredentials(credentials).message}
              </div>
            )}
            
            {credentialsError && (
              <div style={{
                marginTop: '8px',
                padding: '8px',
                backgroundColor: '#fef3cd',
                border: '1px solid #faebcc',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#8a6d3b'
              }}>
                ⚠️ Runtime environment error: {credentialsError}
              </div>
            )}
          </div>
        ) : (
          <div className="input-group">
          <div style={{ position: 'relative', flex: 1 }}>
            <input 
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              type="text" 
              placeholder="Enter Notion Page ID"
              disabled={!connected}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  syncPage(e.target.value);
                }
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: connected ? '#fff' : '#f6f6f6',
                color: connected ? '#37352f' : '#999',
                transition: 'all 0.2s'
              }}
            />
          </div>
          </div>
        )}
      </div>

      {/* Workspace Info & Logout */}
      {connected && (
        <div className="workspace-info" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 0',
          marginBottom: '20px',
          borderBottom: '1px solid #e0e0e0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              backgroundColor: '#000',
              color: '#fff',
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}>
              {workspaceName.charAt(0)}
            </span>
            <span style={{ fontWeight: '500' }}>{workspaceName}</span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f5f5f5',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#666',
              transition: 'all 0.2s'
            }}
          >
            Logout
          </button>
        </div>
      )}

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <div className="documents-list">
        {documents.map((doc) => (
          <div key={doc.id} className="document-item">
            <h3 style={{ 
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '16px'
            }}>Title: {doc.title}</h3>
            
            {/* Display bullet points */}
            {doc.descriptions && doc.descriptions.length > 0 && (
              <div className="descriptions">
                <ul style={{ 
                  listStyleType: 'disc',
                  paddingLeft: '20px',
                  marginBottom: '16px'
                }}>
                  {doc.descriptions.map(desc => (
                    <li key={desc.id} style={{ marginBottom: '8px' }}>
                      {desc.content}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Display code blocks */}
            {doc.codeBlocks && doc.codeBlocks.length > 0 && (
              <div className="code-blocks">
                {doc.codeBlocks.map((block, index) => (
                  <div key={index} className="code-block" style={{
                    backgroundColor: '#f7f6f3',
                    padding: '16px',
                    borderRadius: '3px',
                    marginBottom: '16px',
                    fontFamily: 'Monaco, monospace',
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}>
                    <code style={{ color: '#333' }}>{block.content}</code>
                  </div>
                ))}
              </div>
            )}

            {/* Display tables */}
            {doc.tables && doc.tables.length > 0 && (
              <div className="tables">
                {doc.tables.map(table => (
                  <div key={table.id} className="table-container" style={{ 
                    overflowX: 'auto',
                    marginBottom: '20px'
                  }}>
                    <table style={{ 
                      width: '100%',
                      borderCollapse: 'collapse',
                      marginBottom: '10px'
                    }}>
                      <tbody>
                        {table.rows.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {row.cells.map((cell, cellIndex) => (
                              <td 
                                key={cellIndex}
                                style={{
                                  border: '1px solid #ddd',
                                  padding: '8px',
                                  backgroundColor: rowIndex === 0 ? '#f5f5f5' : 'white'
                                }}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .notion-panel {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .connect-button:hover {
          background-color: #333 !important;
        }

        .notion-logo {
          color: #000;
        }
        
        .document-item {
          margin-bottom: 24px;
          padding: 16px;
          border-radius: 8px;
        }
        
        .input-group {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }

        .input-group input:focus {
          outline: none;
          border-color: #2ecc71;
          box-shadow: 0 0 0 2px rgba(46, 204, 113, 0.2);
        }

        .sync-button:not(:disabled):hover {
          background-color: #27ae60 !important;
        }
        
        .error-message {
          color: #e74c3c;
          padding: 10px;
          margin: 10px 0;
          background-color: #fadbd8;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};
export default NotionPanel;
