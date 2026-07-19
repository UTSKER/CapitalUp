const path = require("path");

const loader = require("./ingestion/loader");
const splitter = require("./ingestion/splitter");

(async () => {
  const docs = await loader.loadDirectory(
    path.join(__dirname, "sources")
  );

  console.log("Documents:", docs.length);

  const chunks = await splitter.split(docs);

  console.log("Chunks:", chunks.length);

  console.log(chunks[0]);
})();