const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key is missing. Please check your .env file.');
    }
    
    this.client = new OpenAI({
      apiKey: apiKey
    });
  }

  /**
   * Generate a response from OpenAI based on conversation messages
   * @param {Array} messages - Array of message objects with role and content
   * @returns {Promise<Object>} - OpenAI response
   */
  async generateResponse(messages) {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      });

      return {
        success: true,
        data: response.choices[0].message,
        usage: response.usage
      };
    } catch (error) {
      console.error('OpenAI API Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate response from OpenAI'
      };
    }
  }
}

module.exports = new OpenAIService();