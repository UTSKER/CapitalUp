const { QdrantClient } = require("@qdrant/js-client-rest");

class QdrantService {
  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });

    this.collectionName = process.env.QDRANT_COLLECTION;
    this.vectorSize = 1024;
  }

  async healthCheck() {
    try {
      const collections = await this.client.getCollections();

      return {
        success: true,
        collections: collections.collections.length,
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async collectionExists() {
    try {
      const collections = await this.client.getCollections();

      return collections.collections.some(
        (collection) => collection.name === this.collectionName
      );
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async createCollection() {
    const exists = await this.collectionExists();

    if (exists) {
      console.log(`✅ Collection '${this.collectionName}' already exists.`);
      return;
    }

    console.log(`📦 Creating collection '${this.collectionName}'...`);

    await this.client.createCollection(this.collectionName, {
      vectors: {
        size: this.vectorSize,
        distance: "Cosine",
      },
    });

    console.log("✅ Collection created.");
  }

  async initialize() {
    await this.createCollection();
  }

  async upsertDocuments(points) {
    await this.initialize();

    return this.client.upsert(this.collectionName, {
      wait: true,
      points,
    });
  }

  async search(vector, limit = 5, filter = undefined) {
    await this.initialize();

    return this.client.search(this.collectionName, {
      vector,
      limit,
      filter,
      with_payload: true,
    });
  }

  async deleteCollection() {
    return this.client.deleteCollection(this.collectionName);
  }
}

module.exports = new QdrantService();