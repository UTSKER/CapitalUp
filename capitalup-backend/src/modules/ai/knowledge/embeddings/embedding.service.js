require("dotenv").config();

const { InferenceClient } = require("@huggingface/inference");

class EmbeddingService {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.model = process.env.EMBEDDING_MODEL || "BAAI/bge-m3";
  }

  async embedQuery(text) {
    if (!this.apiKey) {
      throw new Error("HUGGINGFACE_API_KEY not configured");
    }

    const endpoints = [
      `https://router.huggingface.co/hf-inference/models/${this.model}`,
      `https://api-inference.huggingface.co/models/${this.model}`,
      `https://api-inference.huggingface.co/pipeline/feature-extraction/${this.model}`,
    ];

    let lastError = null;

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "x-wait-for-model": "true",
            "x-use-cache": "true",
          },
          body: JSON.stringify({
            inputs: text,
            options: { wait_for_model: true, use_cache: true },
          }),
        });

        if (response.ok) {
          const embedding = await response.json();
          if (Array.isArray(embedding)) {
            // If HuggingFace returns 2D array [[...]], extract first vector
            return Array.isArray(embedding[0]) ? embedding[0] : embedding;
          }
        } else {
          lastError = new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error("All HuggingFace embedding endpoints failed");
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