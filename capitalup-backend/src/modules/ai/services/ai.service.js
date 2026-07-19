const routerService = require("../router/router.service");
const contextBuilder = require("./context-builder.service");
const llmService = require("./llm.service");
const pool = require("../../../config/postgre");

class AIService {
  async chat(question, user) {
    // Execute the appropriate tool
    const result = await routerService.execute(question, user);

    // Convert structured data into prompt context
    const context = contextBuilder.build(result);

    // Get the user's live details directly from PostgreSQL for accurate personalization
    const userInfo = {
      userId: user?.userId || null,
      email: user?.email || null,
      fullName: "User",
      mobileNumber: "Not provided",
      isEmailVerified: false,
      isMobileVerified: false,
      cashBalance: 0
    };

    if (user && user.userId) {
      try {
        const userRes = await pool.query(
          "SELECT full_name, email, mobile_number, is_email_verified, is_mobile_verified, balance FROM users WHERE user_id = $1",
          [user.userId]
        );
        if (userRes.rows[0]) {
          const u = userRes.rows[0];
          userInfo.fullName = u.full_name || "User";
          userInfo.email = u.email || userInfo.email;
          userInfo.mobileNumber = u.mobile_number || "Not provided";
          userInfo.isEmailVerified = Boolean(u.is_email_verified);
          userInfo.isMobileVerified = Boolean(u.is_mobile_verified);
          userInfo.cashBalance = Number(u.balance || 0);
        }
      } catch (dbError) {
        console.error("Failed to fetch user live profile from PostgreSQL in AI chat:", dbError.message);
      }
    }

    // Ask the LLM
    const reply = await llmService.chat(question, context, userInfo);

    return {
      reply,
      intent: result.intent,
      sources:
        result.type === "RAG"
          ? result.data.documents.map((doc) => ({
              fileName: doc.fileName,
              score: doc.score,
            }))
          : [],
    };
  }
}

module.exports = new AIService();