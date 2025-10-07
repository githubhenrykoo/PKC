/**
 * Telegram Service for PKC Project
 * Communicates with Telegram Controller Service running on port 48637
 */

class TelegramService {
  constructor() {
    this.baseURL = 'http://localhost:48637/api/telegram';
    this.isConnected = false;
  }

  /**
   * Check if Telegram Controller Service is available
   * @returns {Promise<boolean>} - Service availability
   */
  async isAvailable() {
    try {
      const response = await fetch('http://localhost:48637/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.isConnected = data.status === 'healthy';
        return this.isConnected;
      }
      
      this.isConnected = false;
      return false;
    } catch (error) {
      console.error('❌ Telegram service not available:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Get Telegram bot status and configuration
   * @returns {Promise<Object>} - Bot status information
   */
  async getBotStatus() {
    try {
      const response = await fetch(`${this.baseURL}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to get bot status:', error.message);
      throw error;
    }
  }

  /**
   * Send a message to Telegram
   * @param {string} text - Message text to send
   * @returns {Promise<Object>} - Send result
   */
  async sendMessage(text) {
    try {
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new Error('Message text is required and cannot be empty');
      }

      const response = await fetch(`${this.baseURL}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: text.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message_id: data.telegram_message_id,
          timestamp: data.timestamp,
          response_time: data.response_time_ms
        };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error.message);
      throw error;
    }
  }

  /**
   * Retrieve messages from Telegram
   * @param {number} limit - Number of messages to retrieve (default: 10)
   * @param {number} offset - Offset for pagination (default: 0)
   * @returns {Promise<Object>} - Messages data
   */
  async getMessages(limit = 10, offset = 0) {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });

      const response = await fetch(`${this.baseURL}/messages?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          messages: data.messages || [],
          total_count: data.total_count || 0,
          has_more: data.has_more || false,
          pagination: data.pagination || {},
          timestamp: data.timestamp,
          note: data.note // For conflict messages
        };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to retrieve messages:', error.message);
      throw error;
    }
  }

  /**
   * Get monitoring status
   * @returns {Promise<Object>} - Monitoring status
   */
  async getMonitoringStatus() {
    try {
      const response = await fetch(`${this.baseURL}/monitoring`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.monitoring;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to get monitoring status:', error.message);
      throw error;
    }
  }

  /**
   * Clear pending updates to resolve conflicts
   * @returns {Promise<Object>} - Clear result
   */
  async clearUpdates() {
    try {
      const response = await fetch(`${this.baseURL}/clear-updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: data.message,
          timestamp: data.timestamp
        };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to clear updates:', error.message);
      throw error;
    }
  }

  /**
   * Send a test message
   * @returns {Promise<Object>} - Test result
   */
  async sendTestMessage() {
    try {
      const response = await fetch(`${this.baseURL}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message_id: data.telegram_message_id,
          timestamp: data.timestamp
        };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to send test message:', error.message);
      throw error;
    }
  }

  /**
   * Format message for display
   * @param {Object} message - Raw message from Telegram API
   * @returns {Object} - Formatted message
   */
  formatMessage(message) {
    return {
      id: message.message_id,
      role: 'user', // Messages from Telegram are user messages
      content: message.text,
      timestamp: message.date,
      from: {
        id: message.from.id,
        username: message.from.username,
        first_name: message.from.first_name
      },
      chat: {
        id: message.chat.id,
        type: message.chat.type
      },
      update_id: message.update_id
    };
  }

  /**
   * Get connection status
   * @returns {boolean} - Connection status
   */
  getConnectionStatus() {
    return this.isConnected;
  }
}

// Create and export singleton instance
export const telegramService = new TelegramService();
export default telegramService;
