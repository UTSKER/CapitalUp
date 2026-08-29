require("dotenv").config();

const { InferenceClient } = require("@huggingface/inference");

class EmbeddingService {
  constructor() {
    this.client = new InferenceClient(process.env.HUGGINGFACE_API_KEY);
    this.model = process.env.EMBEDDING_MODEL || "BAAI/bge-m3";
  }

  async embedQuery(text) {
    if (!process.env.HUGGINGFACE_API_KEY) {
      throw new Error("HUGGINGFACE_API_KEY not configured");
    }

    try {
      const embedding = await this.client.featureExtraction({
        model: this.model,
        inputs: text,
      });

      return Array.from(embedding);
    } catch (error) {
      throw new Error(`HuggingFace API unavailable (${error.message || "ECONNRESET"})`);
    }
  }

  async embedDocuments(texts) {
    const vectors = [];
    for (const text of texts) {
      vectors.push(await this.embedQuery(text));
    }
    return vectors;
  }
}

module.exports = new EmbeddingService();