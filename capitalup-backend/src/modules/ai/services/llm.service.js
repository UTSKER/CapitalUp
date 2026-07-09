const { ChatGroq } = require("@langchain/groq");
const {
  SystemMessage,
  HumanMessage,
} = require("@langchain/core/messages");
const fs = require("fs");
const path = require("path");

const { SYSTEM_PROMPT } = require("../prompts/system.prompt.js");

class LLMService {
  constructor() {
    this.model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
    });
    this.docsContext = "";
    this.loadDocs();
  }

  loadDocs() {
    try {
      const docsDir = path.join(__dirname, "../docs");
      if (fs.existsSync(docsDir)) {
        const files = fs.readdirSync(docsDir);
        let combined = "\n\n=== CAPITALUP PROJECT DOCUMENTATION AND KNOWLEDGE BASE ===\n";
        files.forEach((file) => {
          if (file.endsWith(".md")) {
            const content = fs.readFileSync(path.join(docsDir, file), "utf-8");
            combined += `\nFile: ${file}\n${content}\n-----------------\n`;
          }
        });
        this.docsContext = combined;
        console.log("AI LLM Service: Loaded documentation files successfully.");
      }
    } catch (err) {
      console.error("AI LLM Service: Failed to load documentation files:", err.message);
    }
  }

  async chat(message) {
    const systemPromptWithContext = `${SYSTEM_PROMPT}\n${this.docsContext}`;
    const response = await this.model.invoke([
      new SystemMessage(systemPromptWithContext),
      new HumanMessage(message),
    ]);

    return response.content;
  }
}

module.exports = new LLMService();