require("dotenv").config();

const { randomUUID } = require("crypto");
const path = require("path");

const loader = require("./loader");
const splitter = require("./splitter");

const embeddingService = require("../embeddings/embedding.service");
const qdrantService = require("../vectorstore/qdrant.service");

class KnowledgeIndexer {
  constructor() {
    this.batchSize = 20;
  }

  async run() {
    try {
      console.log("\n===============================");
      console.log("🚀 CapitalUp Knowledge Indexer");
      console.log("===============================\n");

      // STEP 1
      console.log("📂 Loading documents...");

      const documents = await loader.loadDirectory(
        path.join(__dirname, "../sources")
      );

      console.log(`✅ Loaded ${documents.length} documents\n`);

      // STEP 2
      console.log("✂️ Splitting documents...");

      const chunks = await splitter.split(documents);

      console.log(`✅ Generated ${chunks.length} chunks\n`);

      // STEP 3
      console.log("🧠 Generating embeddings...");

      const points = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        process.stdout.write(
          `\rEmbedding ${i + 1}/${chunks.length}`
        );

        const vector = await embeddingService.embedQuery(
          chunk.pageContent
        );

        points.push({
          id: randomUUID(),

          vector,

          payload: {
            text: chunk.pageContent,

            source: chunk.metadata.source,

            fileName: chunk.metadata.fileName,

            category: chunk.metadata.category,

            chunkIndex: i,

            version: 1,

            indexedAt: new Date().toISOString(),
          },
        });
      }

      console.log("\n✅ Embeddings generated\n");

      // STEP 4
      console.log("☁️ Uploading to Qdrant...");

      for (let i = 0; i < points.length; i += this.batchSize) {
        const batch = points.slice(i, i + this.batchSize);

        await qdrantService.upsertDocuments(batch);

        console.log(
          `Uploaded ${Math.min(
            i + this.batchSize,
            points.length
          )}/${points.length}`
        );
      }

      console.log("\n🎉 Indexing Complete!");

      console.log(`
Summary
-------
Documents : ${documents.length}
Chunks    : ${chunks.length}
Vectors   : ${points.length}
Collection: ${process.env.QDRANT_COLLECTION}
`);
    } catch (error) {
      console.error(error);
    }
  }
}

new KnowledgeIndexer().run();