const aiService = require("../services/ai.service.js");
module.exports = {
  chat: async (req, res, next) => {
    try {
      const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required.",
      });
    }

    const response = await aiService.chat(message);

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
}
}