const { ChatGroq } = require("@langchain/groq");
const {
  SystemMessage,
  HumanMessage,
} = require("@langchain/core/messages");

class LLMService {
  constructor() {
    this.model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
    });
  }

  buildPrompt(question, context) {
    return `
You are CapitalUp AI Support.

Your job is to answer questions ONLY using the provided documentation.

Rules:

1. Use the documentation below as the primary source.
2. If the answer is not present in the documentation, clearly say:
   "I couldn't find this information in the CapitalUp knowledge base."
3. Never invent endpoints, business logic or platform behaviour.
4. Answer clearly and professionally.

=========================
KNOWLEDGE BASE
=========================

${context || "No relevant documentation found."}

=========================
USER QUESTION
=========================

${question}
`;
  }

  async chat(question, context) {
    const prompt = this.buildPrompt(question, context);

    const response = await this.model.invoke([
      new SystemMessage(
        "You are the official AI assistant for CapitalUp."
      ),
      new HumanMessage(prompt),
    ]);

    return response.content;
  }
}

module.exports = new LLMService();