const { ChatGroq } = require("@langchain/groq");
const {
  SystemMessage,
  HumanMessage,
} = require("@langchain/core/messages");

const { SYSTEM_PROMPT } = require("../prompts/system.prompt.js");

class LLMService {
  constructor() {
    this.model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
    });
  }

  async chat(message) {
    const response = await this.model.invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(message),
    ]);

    return response.content;
  }
}

module.exports = new LLMService();