const routerService = require("../router/router.service");
const contextBuilder = require("./context-builder.service");
const llmService = require("./llm.service");

class AIService {
  async chat(question, user) {
    // Execute the appropriate tool
    const result = await routerService.execute(question, user);

    // Convert structured data into prompt context
    const context = contextBuilder.build(result);

    // Ask the LLM
    const reply = await llmService.chat(question, context);

    return {
      reply,
      intent: result.intent,
      sources:
        result.type === "RAG"
          ? result.data.documents.map((doc) => ({
              fileName: doc.fileName,
              score: doc.score,
            }))
          : [],
    };
  }
}

module.exports = new AIService();