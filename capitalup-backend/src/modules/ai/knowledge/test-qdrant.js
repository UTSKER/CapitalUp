require("dotenv").config();

const qdrantService = require("./vectorstore/qdrant.service");

(async () => {
  try {
    console.log("Checking Qdrant...");

    const health = await qdrantService.healthCheck();

    console.log(health);

    await qdrantService.initialize();

    console.log("✅ Ready");
  } catch (err) {
    console.error(err);
  }
})();