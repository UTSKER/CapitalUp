const llmService = require("../services/llm.service.js");

class AIService {
  async chat(message) {
    const reply = await llmService.chat(message);

    return {
      reply,
    };
  }
}

module.exports = new AIService();