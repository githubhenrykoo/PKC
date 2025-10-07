import React, { useState, useEffect, useRef } from 'react';
import { telegramService } from '../../services/telegram-service.js';
import { telegramMCardService } from '../../services/telegram-mcard-service.js';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [telegramAvailable, setTelegramAvailable] = useState(false);
  const [botStatus, setBotStatus] = useState(null);
  const [monitoringStatus, setMonitoringStatus] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [mcardStatus, setMcardStatus] = useState({ isHealthy: false, syncing: false });
  const messagesEndRef = useRef(null);
  const pollingInterval = useRef(null);

  useEffect(() => {
    initializeChatbot();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChatbot = async () => {
    setIsConnecting(true);
    try {
      // Check Telegram Controller Service availability
      const available = await telegramService.isAvailable();
      setTelegramAvailable(available);

      // Check MCard service availability
      const mcardHealthy = await telegramMCardService.checkHealth();
      setMcardStatus(prev => ({ ...prev, isHealthy: mcardHealthy }));
      console.log('📦 MCard service status:', mcardHealthy ? 'Available' : 'Unavailable');

      if (available) {
        // Get bot status
        try {
          const status = await telegramService.getBotStatus();
          setBotStatus(status);
        } catch (error) {
          console.warn('Could not get bot status:', error.message);
        }

        // Get monitoring status
        try {
          const monitoring = await telegramService.getMonitoringStatus();
          setMonitoringStatus(monitoring);
        } catch (error) {
          console.warn('Could not get monitoring status:', error.message);
        }

        // Load existing messages
        await loadMessages();

        // Start polling for new messages
        startMessagePolling();

        // Add welcome message
        setMessages(prev => [{
          id: Date.now(),
          role: 'assistant',
          content: `📱 **Telegram Bot Interface**

Connected to Telegram Controller Service!

**Features:**
• Send messages to Telegram
• View incoming messages in real-time
• Monitor bot status and activity
• Auto-save all messages to MCard database

**MCard Status:** ${mcardHealthy ? '✅ Connected' : '❌ Disconnected'}

Type a message below to send it to your Telegram bot.`,
          timestamp: new Date().toISOString()
        }, ...prev]);
      } else {
        setMessages([{
          id: Date.now(),
          role: 'assistant',
          content: `❌ **Telegram Controller Service Connection Failed**

I couldn't connect to the Telegram Controller Service at http://localhost:48637

**To fix this:**
1. Make sure the Telegram Controller Service is running
2. Start the service: \`cd Telegram_Bot && npm start\`
3. Verify the service is running on port 48637
4. Check the service status: \`curl http://localhost:48637/api/health\`
5. Refresh this page

**Need help?** Check the Telegram Controller Service documentation.`,
          timestamp: new Date().toISOString(),
          isError: true
        }]);
      }
    } catch (error) {
      console.error('❌ Error initializing Telegram chatbot:', error);
      setMessages([{
        id: Date.now(),
        role: 'assistant',
        content: `❌ **Initialization Error**

Failed to initialize the Telegram chatbot: ${error.message}

Please check your Telegram Controller Service and try again.`,
        timestamp: new Date().toISOString(),
        isError: true
      }]);
    } finally {
      setIsConnecting(false);
    }
  };

  const loadMessages = async () => {
    try {
      const result = await telegramService.getMessages(20, 0);
      if (result.success && result.messages.length > 0) {
        const formattedMessages = result.messages
          .map(msg => telegramService.formatMessage(msg))
          .reverse(); // Show oldest first
        
        setMessages(prev => [...formattedMessages, ...prev]);
        setLastMessageCount(result.messages.length);
      }
    } catch (error) {
      console.warn('Could not load existing messages:', error.message);
    }
  };

  const startMessagePolling = () => {
    // Clear existing interval
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
    
    // Poll for new messages every 3 seconds
    pollingInterval.current = setInterval(async () => {
      try {
        const data = await telegramService.getMessages(5, 0);
        console.log('🔍 Polling result:', data); // Debug log
        
        // Process new messages
        if (data.messages && data.messages.length > 0) {
          console.log('📨 Raw messages from API:', data.messages); // Debug log
          
          const newMessages = data.messages.map(msg => ({
            id: `telegram-${msg.message_id}`,
            role: 'user', // Incoming message from Telegram
            content: msg.text || '[No text content]',
            timestamp: typeof msg.date === 'string' ? msg.date : new Date(msg.date * 1000).toISOString(),
            telegramData: msg
          }));

          console.log('🔄 Processed messages:', newMessages); // Debug log

          // Filter out messages we already have
          const existingIds = new Set(messages.map(m => m.id));
          const trulyNewMessages = newMessages.filter(msg => !existingIds.has(msg.id));
          
          console.log('✨ Truly new messages:', trulyNewMessages); // Debug log

          if (trulyNewMessages.length > 0) {
            setMessages(prev => [...prev, ...trulyNewMessages]);
            console.log(`📨 Added ${trulyNewMessages.length} new messages from Telegram`);

            // Save received messages to MCard
            console.log('🔍 Current MCard status:', mcardStatus);
            
            // Try to check MCard health if it appears unhealthy
            if (!mcardStatus.isHealthy) {
              console.log('🏥 MCard appears unhealthy, checking health...');
              try {
                const healthCheck = await telegramMCardService.checkHealth();
                console.log('🏥 Health check result:', healthCheck);
                setMcardStatus(prev => ({ ...prev, isHealthy: healthCheck }));
              } catch (healthError) {
                console.error('❌ Health check failed:', healthError);
              }
            }
            
            if (mcardStatus.isHealthy || await telegramMCardService.checkHealth()) {
              try {
                setMcardStatus(prev => ({ ...prev, syncing: true, isHealthy: true }));
                console.log('💾 Starting to save received messages to MCard...', trulyNewMessages);
                
                for (const message of trulyNewMessages) {
                  console.log('💾 Saving message to MCard:', {
                    content: message.content,
                    timestamp: message.timestamp,
                    id: message.id
                  });
                  
                  const result = await telegramMCardService.saveReceivedMessage(message.content, message.timestamp);
                  console.log('✅ MCard save result:', result);
                }
                
                setMcardStatus(prev => ({ ...prev, syncing: false }));
                console.log(`📦 Successfully saved ${trulyNewMessages.length} received messages to MCard`);
              } catch (mcardError) {
                console.error('❌ Failed to save received messages to MCard:', mcardError);
                console.error('❌ MCard error details:', {
                  message: mcardError.message,
                  stack: mcardError.stack
                });
                setMcardStatus(prev => ({ ...prev, syncing: false, isHealthy: false }));
              }
            } else {
              console.warn('⚠️ MCard service not healthy, skipping message save');
              console.warn('⚠️ Please check if MCard service is running on http://localhost:49384');
            }
          }
        }
      } catch (error) {
        console.debug('Polling error (will retry):', error.message);
      }
    }, 3000);
  };

  const stopMessagePolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMessagePolling();
    };
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !telegramAvailable) return;

    const userMessage = {
      id: Date.now(),
      role: 'outgoing', // Outgoing message to Telegram
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const result = await telegramService.sendMessage(userMessage.content);
      
      if (result.success) {
        // Save sent message to MCard
        if (mcardStatus.isHealthy) {
          try {
            setMcardStatus(prev => ({ ...prev, syncing: true }));
            await telegramMCardService.saveSentMessage(userMessage.content, userMessage.timestamp);
            setMcardStatus(prev => ({ ...prev, syncing: false }));
            console.log('📦 Sent message saved to MCard');
          } catch (mcardError) {
            console.error('❌ Failed to save sent message to MCard:', mcardError.message);
            setMcardStatus(prev => ({ ...prev, syncing: false }));
          }
        }

        const confirmationMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: `✅ **Message sent to Telegram**

Message ID: ${result.message_id}
Sent at: ${new Date(result.timestamp).toLocaleTimeString()}
Response time: ${result.response_time}ms
${mcardStatus.isHealthy ? '📦 Saved to MCard database' : '⚠️ MCard save unavailable'}

Your message has been delivered to Telegram successfully!`,
          timestamp: new Date().toISOString(),
          isSuccess: true
        };

        setMessages(prev => [...prev, confirmationMessage]);
      }
    } catch (error) {
      console.error('❌ Error sending message to Telegram:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `❌ **Error sending message to Telegram**

${error.message}

**Troubleshooting:**
• Check if Telegram Controller Service is running on port 48637
• Verify your bot token and chat ID are correct
• Try the clear updates endpoint if there are conflicts
• Check the service logs for more details`,
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    stopMessagePolling();
    setMessages([]);
    initializeChatbot();
  };

  const refreshConnection = async () => {
    setIsConnecting(true);
    stopMessagePolling();
    await initializeChatbot();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isConnecting) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm opacity-70">Connecting to Telegram Controller Service...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16c-.169 1.858-.896 6.728-.896 6.728-.377 2.655-.377 2.655-1.568 2.655-.896 0-1.568-.896-1.568-1.792 0-.448.224-.896.448-1.344l.896-2.208c.224-.672.224-.672 0-1.344-.224-.448-.672-.672-1.12-.672s-.896.224-1.12.672c-.224.672-.224.672 0 1.344l.896 2.208c.224.448.448.896.448 1.344 0 .896-.672 1.792-1.568 1.792-1.191 0-1.191 0-1.568-2.655 0 0-.727-4.87-.896-6.728C8.16 6.727 8.16 6.727 12 6.727s3.84 0 3.568 1.433z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Telegram Bot</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {telegramAvailable ? 
                `Connected • ${botStatus?.bot_info?.username || 'Bot'}` : 
                'Disconnected'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {telegramAvailable && monitoringStatus && (
            <div className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
              {monitoringStatus.is_monitoring ? '🟢 Monitoring' : '🔴 Not Monitoring'}
            </div>
          )}
          
          {/* MCard Status Indicator */}
          <div className={`text-xs px-2 py-1 rounded ${
            mcardStatus.syncing
              ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
              : mcardStatus.isHealthy
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}>
            {mcardStatus.syncing ? '📦 Syncing...' : mcardStatus.isHealthy ? '📦 MCard' : '📦 MCard Off'}
          </div>
          
          <button
            onClick={refreshConnection}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Refresh connection"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          
          <button
            onClick={clearChat}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Clear chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'outgoing' || message.role === 'assistant' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-cyan-500 text-white' // Incoming Telegram messages
                  : message.role === 'outgoing'
                  ? 'bg-blue-600 text-white' // Outgoing messages to Telegram
                  : message.isError
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-100 border border-red-200 dark:border-red-800'
                  : message.isSuccess
                  ? 'bg-green-50 dark:bg-green-900/30 text-green-900 dark:text-green-100 border border-green-200 dark:border-green-800'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">{message.content}</div>
              <div className={`text-xs mt-1 opacity-70 ${
                message.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {formatTimestamp(message.timestamp)}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-gray-600 border-t-transparent"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={telegramAvailable ? "Type your message to send to Telegram... (Enter to send, Shift+Enter for new line)" : "Telegram Controller Service not available"}
            className="flex-1 resize-none px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows="2"
            disabled={!telegramAvailable || isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading || !telegramAvailable}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        
        {!telegramAvailable && (
          <div className="mt-2 text-xs text-red-600 dark:text-red-400">
            ⚠️ Telegram Controller Service is not available. Please start the service on port 48637 and refresh the page.
          </div>
        )}
      </div>
    </div>
  );
};

export default Chatbot;
