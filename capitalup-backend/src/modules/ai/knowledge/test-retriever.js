require("dotenv").config();

const retriever = require("./retrieval/retriever.service");

(async () => {
  const docs = await retriever.retrieve(
    "Why was my KYC rejected?"
  );

  console.log("\n=========================\n");

  console.log("Retrieved:", docs.length);

  docs.forEach((doc, i) => {
    console.log(`Result ${i + 1}`);
    console.log("Score :", doc.score);
    console.log("Source:", doc.fileName);
    console.log(doc.text);
    console.log("-----------------------------------");
  });
})();