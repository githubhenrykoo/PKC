/**
 * Ollama Service for Browser Integration
 * Provides text rewriting and chatbot functionality using Ollama API
 */

class OllamaService {
  constructor() {
    this.baseUrl = 'http://localhost:11434';
    this.model = 'llama3';
    console.log('🤖 OllamaService initialized with baseUrl:', this.baseUrl);
  }

  /**
   * Check if Ollama service is available
   */
  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('❌ Ollama service not available:', error);
      return false;
    }
  }

  /**
   * Get available models
   */
  async getModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('❌ Error fetching Ollama models:', error);
      return [];
    }
  }

  /**
   * Generate text using Ollama
   */
  async generate(prompt, options = {}) {
    try {
      const requestBody = {
        model: options.model || this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          ...options.modelOptions
        }
      };

      console.log('🤖 Sending request to Ollama:', { prompt: prompt.substring(0, 100) + '...', model: requestBody.model });

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Ollama response received');
      return data.response;
    } catch (error) {
      console.error('❌ Error generating text with Ollama:', error);
      throw error;
    }
  }

  /**
   * Rewrite text with specific instructions (following rewrite.js pattern)
   */
  async rewriteText(text, instruction) {
    const prompt = `You are a text rewriter. Rewrite the text to be ${instruction} while keeping the original meaning: "${text}"`;
    
    try {
      const rewrittenText = await this.generate(prompt, {
        temperature: 0.8,
        top_p: 0.9
      });
      
      return rewrittenText.trim();
    } catch (error) {
      console.error('❌ Error rewriting text:', error);
      throw error;
    }
  }

  /**
   * Chat with Ollama (for general conversation)
   */
  async chat(message, context = []) {
    let prompt = message;
    
    // Add context if provided
    if (context.length > 0) {
      const contextString = context.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      prompt = `Context:\n${contextString}\n\nUser: ${message}\nAssistant:`;
    }
    
    try {
      const response = await this.generate(prompt, {
        temperature: 0.7,
        top_p: 0.9
      });
      
      return response.trim();
    } catch (error) {
      console.error('❌ Error in chat:', error);
      throw error;
    }
  }

  /**
   * Extract and rewrite slide text content
   */
  async rewriteSlideText(slideData, instruction) {
    try {
      // Extract text from slide elements
      const textElements = this.extractTextFromSlide(slideData);
      
      if (textElements.length === 0) {
        throw new Error('No text elements found in slide');
      }

      // Rewrite each text element
      const rewrittenElements = [];
      for (const element of textElements) {
        const rewrittenText = await this.rewriteText(element.text, instruction);
        rewrittenElements.push({
          ...element,
          rewrittenText: rewrittenText
        });
      }

      return rewrittenElements;
    } catch (error) {
      console.error('❌ Error rewriting slide text:', error);
      throw error;
    }
  }

  /**
   * Extract text content from slide data
   */
  extractTextFromSlide(slideData) {
    const textElements = [];
    
    if (slideData.pageElements) {
      slideData.pageElements.forEach((element, elementIndex) => {
        if (element.shape && element.shape.text && element.shape.text.textElements) {
          element.shape.text.textElements.forEach((textElement, textIndex) => {
            if (textElement.textRun && textElement.textRun.content) {
              const content = textElement.textRun.content.trim();
              if (content && content !== '\n') {
                textElements.push({
                  objectId: element.objectId,
                  elementIndex: elementIndex,
                  textIndex: textIndex,
                  text: content,
                  style: textElement.textRun.style || {}
                });
              }
            }
          });
        }
      });
    }
    
    return textElements;
  }

  /**
   * Generate slide content suggestions
   */
  async generateSlideContent(topic, slideType = 'general') {
    const prompts = {
      title: `Create a compelling title for a slide about: ${topic}`,
      bullet_points: `Create 3-5 bullet points for a slide about: ${topic}`,
      general: `Create slide content about: ${topic}. Include a title and 3-4 key points.`,
      conclusion: `Create a conclusion slide for a presentation about: ${topic}`,
      introduction: `Create an introduction slide for a presentation about: ${topic}`
    };

    const prompt = prompts[slideType] || prompts.general;
    
    try {
      const content = await this.generate(prompt, {
        temperature: 0.8,
        top_p: 0.9
      });
      
      return content.trim();
    } catch (error) {
      console.error('❌ Error generating slide content:', error);
      throw error;
    }
  }

  /**
   * Improve existing slide content
   */
  async improveSlideContent(currentContent, improvementType = 'general') {
    const prompts = {
      clarity: `Improve the clarity and readability of this slide content: ${currentContent}`,
      engagement: `Make this slide content more engaging and interesting: ${currentContent}`,
      professional: `Make this slide content more professional and formal: ${currentContent}`,
      casual: `Make this slide content more casual and friendly: ${currentContent}`,
      concise: `Make this slide content more concise and to the point: ${currentContent}`,
      general: `Improve this slide content to make it better: ${currentContent}`
    };

    const prompt = prompts[improvementType] || prompts.general;
    
    try {
      const improvedContent = await this.generate(prompt, {
        temperature: 0.7,
        top_p: 0.9
      });
      
      return improvedContent.trim();
    } catch (error) {
      console.error('❌ Error improving slide content:', error);
      throw error;
    }
  }
}

// Export default instance
export const ollamaService = new OllamaService();
export default ollamaService;
