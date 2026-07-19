require("dotenv").config();

const { InferenceClient } = require("@huggingface/inference");

class EmbeddingService {
  constructor() {
    this.client = new InferenceClient(process.env.HUGGINGFACE_API_KEY);
    this.model = "BAAI/bge-m3";
  }

  async embedQuery(text) {
    const embedding = await this.client.featureExtraction({
      model: this.model,
      inputs: text,
    });

    return Array.from(embedding);
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