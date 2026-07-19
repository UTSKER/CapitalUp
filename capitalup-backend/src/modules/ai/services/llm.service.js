const { ChatGroq } = require("@langchain/groq");
const {
  SystemMessage,
  HumanMessage,
} = require("@langchain/core/messages");

class LLMService {
  constructor() {
    this.model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
    });
  }

  buildPrompt(question, context, user = null) {
    const currentDate = new Date().toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    });

    const userInfoText = user 
      ? `Authenticated User Profile (Live PostgreSQL Database Record):
- Full Name: ${user.fullName || "User"}
- Email: ${user.email || "N/A"}
- User ID: ${user.userId || "N/A"}
- Mobile Number: ${user.mobileNumber || "Not provided"}
- Email Verified: ${user.isEmailVerified ? "Yes" : "No"}
- Mobile Verified: ${user.isMobileVerified ? "Yes" : "No"}
- Available Cash Balance: ₹${(user.cashBalance || 0).toLocaleString('en-IN')}`
      : "No authenticated user profile context provided.";

    return `
You are CapitalUp AI Support.

Current Date and Time (IST): ${currentDate}

${userInfoText}

Rules:
1. Use the provided KNOWLEDGE BASE or LIVE CONTEXT below as your primary source of truth.
2. If the user greets you (e.g., "hii", "hello", "hey"), greet them back warmly and professionally.
3. If the user asks about the current date/time, answer using the Current Date and Time provided above.
4. If the user asks general questions or asks for general advice not covered in the knowledge base, you may use your general knowledge, but keep it aligned with the theme of a paper trading application.
5. If the user asks about their own profile details, name, or email, use the "Authenticated User Profile" section provided above.
6. If you do not have enough platform-specific details to answer (e.g., user transactions, specific order execution status, or platform manuals that require database lookup), mention that you couldn't find this information in the CapitalUp knowledge base.
7. Never invent backend endpoints, API secrets, or platform database schemas.
8. Answer clearly and professionally.
9. **Privacy Guard**: Do NOT share internal technical code details, middleware names, server verification mechanics, token schemas, database structures, or local storage key configurations. Keep answers user-facing and high-level.
10. **Relevance Filter**: If the user's question is entirely unrelated to stock trading, investments, finance, or CapitalUp, prefix your response with "[UNRELATED_PROMPT_ALERT]" and ask them to stick to trading or platform questions.

=========================
KNOWLEDGE BASE / LIVE CONTEXT
=========================

${context || "No relevant documentation found."}

=========================
USER QUESTION
=========================

${question}
`;
  }

  async chat(question, context, user = null) {
    const prompt = this.buildPrompt(question, context, user);

    const response = await this.model.invoke([
      new SystemMessage(
        "You are the official AI assistant for CapitalUp."
      ),
      new HumanMessage(prompt),
    ]);

    return response.content;
  }
}

module.exports = new LLMService();