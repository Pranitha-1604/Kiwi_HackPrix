const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('Gemini API key is missing. Please check your .env file.');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
  }

  /**
   * Convert messages from OpenAI format to Gemini format
   * @param {Array} messages - Array of message objects with role and content
   * @returns {Array} - Formatted messages for Gemini
   */
  formatMessages(messages) {
    // Gemini uses a different format than OpenAI
    // We need to convert the messages to a format Gemini understands
    const formattedMessages = [];
    
    for (const message of messages) {
      // Map OpenAI roles to Gemini roles
      let role = message.role;
      if (role === 'assistant') {
        role = 'model';
      } else if (role === 'system') {
        // Gemini doesn't have a system role, so we'll add it as a user message
        role = 'user';
      }
      
      formattedMessages.push({
        role: role,
        parts: [{ text: message.content }]
      });
    }
    
    return formattedMessages;
  }

  /**
   * Generate a response from Gemini based on conversation messages
   * @param {Array} messages - Array of message objects with role and content
   * @returns {Promise<Object>} - Gemini response
   */
  async generateResponse(messages) {
    try {
      // Format messages for Gemini
      const formattedMessages = this.formatMessages(messages);
      
      // Create a chat session
      const chat = this.model.startChat({
        history: formattedMessages.slice(0, -1), // All messages except the last one
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      });
      
      // Get the last message to send
      const lastMessage = formattedMessages[formattedMessages.length - 1];
      
      // Generate response
      const result = await chat.sendMessage(lastMessage.parts[0].text);
      const response = result.response;
      
      return {
        success: true,
        data: {
          role: 'assistant',
          content: response.text()
        }
      };
    } catch (error) {
      console.error('Gemini API Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate response from Gemini'
      };
    }
  }
}

module.exports = new GeminiService();