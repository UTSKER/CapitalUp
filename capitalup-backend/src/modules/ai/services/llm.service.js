const { ChatGroq } = require("@langchain/groq");
const {
  SystemMessage,
  HumanMessage,
} = require("@langchain/core/messages");

function cleanLLMResponse(rawText) {
  if (!rawText || typeof rawText !== "string") return "";

  let cleaned = rawText.trim();

  // 1. Remove complete <think>...</think> blocks
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 2. If <think> tag is unclosed, check if a draft response is present inside or after it
  if (cleaned.includes("<think>") || cleaned.startsWith("<think>")) {
    const draftMatch = cleaned.match(/(?:Draft Construction.*?:\s*|Final Answer:\s*|Response:\s*)([\s\S]+)$/i);
    if (draftMatch && draftMatch[1]) {
      cleaned = draftMatch[1].trim();
    } else {
      // It is purely internal thought without user answer
      cleaned = "";
    }
  }

  // 3. Remove raw thinking analysis prefixes if present
  cleaned = cleaned.replace(/^Here's a thinking process:[\s\S]*?(?:Formulate Response.*?:|Final Answer:|\n\n)/i, "").trim();

  return cleaned;
}

let cachedGroqModels = null;

async function getActiveGroqModels() {
  if (cachedGroqModels && cachedGroqModels.length > 0) {
    return cachedGroqModels;
  }

  const fallbackList = [
    process.env.GROQ_MODEL,
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "groq/compound-mini",
    "qwen/qwen-2.5-coder-32b",
    "allam-2-7b",
  ].filter(Boolean);

  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    });
    if (res.ok) {
      const body = await res.json();
      if (body && Array.isArray(body.data)) {
        const isExcluded = (id) =>
          id.includes("whisper") ||
          id.includes("guard") ||
          id.includes("embed") ||
          id.includes("orpheus") ||
          id.includes("vision");

        const availableModels = body.data
          .map((m) => m.id)
          .filter((id) => !isExcluded(id));

        if (availableModels.length > 0) {
          cachedGroqModels = availableModels;
          return cachedGroqModels;
        }
      }
    }
  } catch (e) {}

  cachedGroqModels = fallbackList;
  return cachedGroqModels;
}

async function queryGemini(prompt, apiKey) {
  const models = [process.env.GEMINI_MODEL, "gemini-1.5-flash", "gemini-2.0-flash"].filter(Boolean);
  let lastErr = null;

  const isBearer = apiKey.startsWith("AQ.") || apiKey.startsWith("ya29.");

  for (const model of models) {
    try {
      const headers = { "Content-Type": "application/json" };
      let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      if (isBearer) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      } else {
        url += `?key=${apiKey}`;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 300
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (candidateText) {
        return candidateText.trim();
      }
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error("Gemini query failed");
}

class LLMService {
  getActiveGroqModels() {
    return getActiveGroqModels();
  }

  getModel(modelName) {
    return new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: modelName,
      temperature: 0.2,
      maxTokens: 250,
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
      ? `User Profile:
- Name: ${user.fullName || "Trader"}
- Available Balance: ₹${(user.cashBalance || 0).toLocaleString('en-IN')}`
      : "";

    return `You are CapitalUp AI Assistant, a concise, smart financial copilot.

Current Date & Time: ${currentDate}
${userInfoText}

CRITICAL RULES:
1. **CONCISE RESPONSE**: Keep your final answer under 60-90 words. Direct, polite, and helpful.
2. **NO TECHNICAL LEAKS (ZERO TOLERANCE)**: NEVER mention API endpoints (e.g. GET/POST /api/...), code snippets, markdown filenames (like "portfolio.md" or "admin.md"), database tables, middlewares, or internal server mechanics.
3. **GREETINGS & CASUAL QUESTIONS**: For greetings (e.g., "hy", "hi", "how are you"), reply warmly and concisely in 1-2 friendly sentences. Do NOT output documentation.
4. **PLATFORM ASSISTANCE**: Use the Live Context below to answer user queries about their KYC, portfolio, or trading.
5. **DO NOT OUTPUT THINKING TAGS**: Give ONLY the final response to the user. Do not include <think> or internal reasoning in your output.

=== CONTEXT ===
${context || "No extra context."}

=== USER QUESTION ===
${question}
`;
  }

  async chat(question, context, user = null) {
    const prompt = this.buildPrompt(question, context, user);

    // 1. If GEMINI_API_KEY is configured, use high-throughput Gemini Flash (1,000,000 Tokens/Min Free)
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (geminiKey) {
      try {
        const raw = await queryGemini(prompt, geminiKey, process.env.GEMINI_MODEL || "gemini-2.0-flash");
        const cleaned = cleanLLMResponse(raw);
        if (cleaned) return cleaned;
      } catch (geminiErr) {
        console.warn("⚠️ Gemini API failed, falling back to Groq:", geminiErr.message);
      }
    }

    // 2. Groq Engine Fallback
    const modelsToTry = await getActiveGroqModels();
    for (const modelName of modelsToTry) {
      try {
        const modelInstance = this.getModel(modelName);
        const response = await modelInstance.invoke([
          new SystemMessage(
            "You are the official CapitalUp AI Assistant. Provide only the final helpful answer directly without thinking tags or metadata."
          ),
          new HumanMessage(prompt),
        ]);

        const rawReply = typeof response?.content === "string" 
          ? response.content.trim() 
          : (Array.isArray(response?.content) ? response.content.map(c => c.text || "").join("").trim() : "");

        const cleanedReply = cleanLLMResponse(rawReply);

        if (cleanedReply) {
          return cleanedReply;
        }
      } catch (llmError) {
        if (llmError.message.includes("429") || llmError.message.includes("Rate limit")) {
          const match = llmError.message.match(/try again in ([\d.]+)s/i);
          const waitMs = match ? Math.ceil(parseFloat(match[1]) * 1000) + 300 : 1800;
          await new Promise((r) => setTimeout(r, Math.min(waitMs, 4000)));
        } else {
          console.warn(`⚠️ Groq model [${modelName}] failed (${llmError.message}), trying next model...`);
        }
      }
    }

    console.warn("⚠️ All Groq models failed, generating clean fallback response");

    const q = question.toLowerCase().trim();

    // Greetings fallback
    if (/^(hi+|hy+|hey+|hello+|how\s*are\s*you|how\s*r\s*u)/i.test(q)) {
      return `Hello ${user?.fullName || "there"}! I'm doing great, thank you. I am your CapitalUp AI Assistant. How can I help you with your portfolio, KYC status, or stock market trading today?`;
    }

    // KYC fallback
    if (q.includes("kyc") || q.includes("pan") || q.includes("verification")) {
      if (context.includes("NOT_STARTED")) {
        return "Your KYC verification has not been started yet. You can complete it in your Profile Settings by uploading your PAN and Aadhaar documents.";
      }
      if (context.includes("APPROVED")) {
        return "Your KYC verification is currently **APPROVED**. Your trading account is fully verified and active.";
      }
      if (context.includes("PENDING")) {
        return "Your KYC verification is currently **PENDING** review by our compliance team.";
      }
      return "You can check and update your KYC verification status anytime in Profile Settings.";
    }

    // Portfolio fallback
    if (q.includes("portfolio") || q.includes("holding") || q.includes("balance") || q.includes("pnl")) {
      return "You can view your live holdings, invested value, and real-time profit & loss in the Portfolio tab.";
    }

    // Default clean fallback
    return "I am your CapitalUp AI Assistant. You can ask me about your live portfolio, KYC verification status, stock quotes, or platform features.";
  }
}

module.exports = new LLMService();
