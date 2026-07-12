const fs = require("fs/promises");
const path = require("path");

class DocumentLoader {
  async loadDirectory(directoryPath) {
    const documents = [];

    await this.walk(directoryPath, documents);

    return documents;
  }

  async walk(directory, documents) {
    const entries = await fs.readdir(directory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await this.walk(fullPath, documents);
        continue;
      }

      if (!entry.name.endsWith(".md")) continue;

      const content = await fs.readFile(fullPath, "utf8");

      documents.push({
        content,
        metadata: {
          source: fullPath,
          fileName: entry.name,
          category: path.basename(path.dirname(fullPath)),
        },
      });
    }
  }
}

module.exports = new DocumentLoader();