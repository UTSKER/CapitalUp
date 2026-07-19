const EmbeddingService = require("./embedding.service");

class EmbeddingFactory {
  static getInstance() {
    return new EmbeddingService();
  }
}

module.exports = EmbeddingFactory;