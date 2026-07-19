const embeddingService = require("../embeddings/embedding.service");
const qdrantService = require("../vectorstore/qdrant.service");

class RetrieverService {
  constructor() {
    // Minimum similarity score required
    this.threshold = 0.65;
    this.cachedChunks = null;
  }

  async getLocalChunks() {
    if (this.cachedChunks) return this.cachedChunks;
    try {
      const loader = require("../ingestion/loader");
      const splitter = require("../ingestion/splitter");
      const path = require("path");
      
      const documents = await loader.loadDirectory(
        path.join(__dirname, "../sources")
      );
      const chunks = await splitter.split(documents);
      this.cachedChunks = chunks.map(chunk => ({
        text: chunk.pageContent,
        fileName: chunk.metadata.fileName,
        category: chunk.metadata.category || "support",
      }));
      return this.cachedChunks;
    } catch (e) {
      console.error("Failed to load local chunks for RAG fallback:", e.message);
      return [];
    }
  }

  async retrieveLocalFallback(query, limit = 5) {
    console.log("RAG embedding service slow/unavailable. Falling back to local keyword retriever.");
    const chunks = await this.getLocalChunks();
    const queryWords = query.toLowerCase().split(/[\s,?.!]+/);
    
    const scored = chunks.map(chunk => {
      const text = chunk.text.toLowerCase();
      let score = 0;
      queryWords.forEach(word => {
        if (word.length > 2) {
          if (text.includes(word)) {
            score += 2; // Word match
          }
        }
      });

      // Boost score if query matches the manual's filename
      const fileWords = chunk.fileName.toLowerCase().split(/[\s_.-]+/);
      queryWords.forEach(word => {
        if (word.length > 2 && fileWords.includes(word)) {
          score += 5; // Document name matches query keyword (e.g. "order" matches order.md)
        }
      });

      return {
        text: chunk.text,
        score: score / 10.0, // normalize score
        source: chunk.fileName,
        fileName: chunk.fileName,
        category: chunk.category,
        chunkIndex: 0
      };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async retrieve(query, limit = 5) {
    try {
      // Set a strict 3-second timeout for the HuggingFace embedding API call
      const vector = await Promise.race([
        embeddingService.embedQuery(query),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("HuggingFace embedding API timeout")), 3000)
        )
      ]);

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
    } catch (error) {
      console.warn("RAG Vector retrieval failed:", error.message);
      return this.retrieveLocalFallback(query, limit);
    }
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