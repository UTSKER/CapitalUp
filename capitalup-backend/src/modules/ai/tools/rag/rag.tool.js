const retrieverService = require("../../knowledge/retrieval/retriever.service");

class RAGTool {
  async execute({ question }) {
    const documents = await retrieverService.retrieve(question);

    return {
      type: "RAG",

      data: {
        documents,
      },
    };
  }
}

module.exports = new RAGTool();