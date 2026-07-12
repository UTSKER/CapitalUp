const intentRouter = require("./intent.router");
const tools = require("../tools");

class RouterService {
  async execute(question, user) {
    // Step 1: Detect intent
    const intent = intentRouter.route(question);

    console.log("Detected Intent:", intent);

    // Step 2: Get matching tool
    const tool = tools[intent];

    if (!tool) {
      throw new Error(`No tool found for intent: ${intent}`);
    }

    // Step 3: Execute tool
    const result = await tool.execute({
      question,
      user,
    });

    // Step 4: Return result
    return {
      intent,
      ...result,
    };
  }
}

module.exports = new RouterService();