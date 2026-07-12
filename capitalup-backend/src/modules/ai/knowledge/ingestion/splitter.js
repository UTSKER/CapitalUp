const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");

class DocumentSplitter {
  constructor() {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 150,
      separators: [
        "\n## ",
        "\n### ",
        "\n#### ",
        "\n\n",
        "\n",
        " ",
        "",
      ],
    });
  }

  async split(documents) {
    const chunks = [];

    for (const document of documents) {
      const docs = await this.splitter.createDocuments(
        [document.content],
        [document.metadata]
      );

      chunks.push(...docs);
    }

    return chunks;
  }
}

module.exports = new DocumentSplitter();