/**
 * Telegram MCard Service
 * Handles saving Telegram chat messages to MCard database
 */

class TelegramMCardService {
  constructor() {
    this.baseURL = 'http://localhost:49384/v1';
    this.isHealthy = false;
  }

  /**
   * Check MCard service health
   * @returns {Promise<boolean>} - Service health status
   */
  async checkHealth() {
    try {
      console.log('🏥 Checking MCard service health at:', `${this.baseURL}/health`);
      
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      console.log('🏥 MCard health response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🏥 MCard health response data:', data);
        this.isHealthy = data.status === 'healthy';
        console.log('🏥 MCard service health result:', this.isHealthy);
        return this.isHealthy;
      }
      
      console.log('❌ MCard health check failed - response not ok');
      this.isHealthy = false;
      return false;
    } catch (error) {
      console.error('❌ MCard service health check failed:', error.message);
      console.error('❌ MCard service URL:', `${this.baseURL}/health`);
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * Save content to MCard
   * @param {string} content - JSON content to save
   * @returns {Promise<Object>} - Save result with hash
   */
  async saveToMCard(content) {
    try {
      const formData = new FormData();
      formData.append('content', content);

      const response = await fetch(`${this.baseURL}/card`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          hash: data.hash,
          content_type: data.content_type,
          g_time: data.g_time
        };
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Failed to save to MCard:', error.message);
      throw error;
    }
  }

  /**
   * Save sent message (PKC to Telegram) to MCard
   * @param {string} messageText - The message content
   * @param {string} timestamp - Message timestamp
   * @returns {Promise<Object>} - Save result
   */
  async saveSentMessage(messageText, timestamp) {
    try {
      const messageData = {
        sender: "system",
        content: messageText,
        type: "telegram",
        timestamp: timestamp,
        source: "pkc-chat",
        contentType: "application/json"
      };

      const jsonContent = JSON.stringify(messageData, null, 2);
      const result = await this.saveToMCard(jsonContent);

      console.log('✅ Sent message saved to MCard:', {
        hash: result.hash,
        content: messageText.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
        timestamp: timestamp
      });

      return {
        success: true,
        hash: result.hash,
        type: 'sent',
        message: 'Sent message saved to MCard successfully'
      };
    } catch (error) {
      console.error('❌ Failed to save sent message to MCard:', error.message);
      throw error;
    }
  }

  /**
   * Save received message (Telegram to PKC) to MCard
   * @param {string} messageText - The message content
   * @param {string} timestamp - Message timestamp
   * @returns {Promise<Object>} - Save result
   */
  async saveReceivedMessage(messageText, timestamp) {
    try {
      console.log('🔄 Preparing to save received message to MCard:', {
        messageText: messageText,
        timestamp: timestamp,
        messageLength: messageText.length
      });

      const messageData = {
        sender: "system",
        content: messageText,
        type: "telegram",
        timestamp: timestamp,
        source: "telegram-chat",
        contentType: "application/json"
      };

      console.log('📋 Message data structure:', messageData);

      const jsonContent = JSON.stringify(messageData, null, 2);
      console.log('📝 JSON content to save:', jsonContent);

      const result = await this.saveToMCard(jsonContent);
      console.log('💾 MCard save response:', result);

      console.log('✅ Received message saved to MCard:', {
        hash: result.hash,
        content: messageText.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
        timestamp: timestamp
      });

      return {
        success: true,
        hash: result.hash,
        type: 'received',
        message: 'Received message saved to MCard successfully',
        messageData: messageData
      };
    } catch (error) {
      console.error('❌ Failed to save received message to MCard:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        messageText: messageText,
        timestamp: timestamp
      });
      throw error;
    }
  }

  /**
   * Save multiple messages in batch
   * @param {Array} messages - Array of message objects with {text, timestamp, type}
   * @returns {Promise<Object>} - Batch save result
   */
  async saveBatchMessages(messages) {
    try {
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const message of messages) {
        try {
          let result;
          if (message.type === 'sent') {
            result = await this.saveSentMessage(message.text, message.timestamp);
          } else if (message.type === 'received') {
            result = await this.saveReceivedMessage(message.text, message.timestamp);
          } else {
            throw new Error(`Unknown message type: ${message.type}`);
          }
          
          results.push(result);
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to save message in batch:`, error.message);
          results.push({
            success: false,
            error: error.message,
            message: message
          });
          errorCount++;
        }
      }

      return {
        success: errorCount === 0,
        totalMessages: messages.length,
        successCount,
        errorCount,
        results,
        message: `Batch save completed: ${successCount} successful, ${errorCount} failed`
      };
    } catch (error) {
      console.error('❌ Batch message save failed:', error.message);
      throw error;
    }
  }

  /**
   * Get service status for debugging
   * @returns {Object} - Service status information
   */
  getStatus() {
    return {
      baseURL: this.baseURL,
      isHealthy: this.isHealthy,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const telegramMCardService = new TelegramMCardService();
