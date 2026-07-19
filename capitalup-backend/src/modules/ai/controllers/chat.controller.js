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

      console.log("Authenticated User:", req.user);

      const response = await aiService.chat(
        message,
        req.user
      );

      return res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  },
};