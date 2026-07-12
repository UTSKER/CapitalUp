const embeddingService = require("../embeddings/embedding.service");
const qdrantService = require("../vectorstore/qdrant.service");

class RetrieverService {
  constructor() {
    // Minimum similarity score required
    this.threshold = 0.65;
  }

  async retrieve(query, limit = 5) {
    const vector = await embeddingService.embedQuery(query);

    const results = await qdrantService.search(vector, limit);

    return results
      .filter((result) => result.score >= this.threshold)
      .map((result) => ({
        text: result.payload.text,
        score: result.score,
        source: result.payload.source,
        fileName: result.payload.fileName,
        category: result.payload.category,
        chunkIndex: result.payload.chunkIndex,
      }));
  }

  async retrieveWithScore(query, limit = 5) {
    return this.retrieve(query, limit);
  }

  formatContext(results) {
    return results
      .map(
        (doc) =>
`Source: ${doc.fileName}

${doc.text}`
      )
      .join("\n\n----------------------------------------\n\n");
  }
}

module.exports = new RetrieverService();