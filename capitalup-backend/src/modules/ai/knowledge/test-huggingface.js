require("dotenv").config();

const { InferenceClient } = require("@huggingface/inference");

(async () => {
  try {
    const client = new InferenceClient(process.env.HUGGINGFACE_API_KEY);

    console.log("Generating embedding...");

    const embedding = await client.featureExtraction({
      model: "BAAI/bge-m3",
      inputs: "How do I complete my KYC?",
    });

    console.log("Type:", typeof embedding);
    console.log("Length:", embedding.length);
    console.log("First 10 values:", embedding.slice(0, 10));
  } catch (err) {
    console.error(err);
  }
})();