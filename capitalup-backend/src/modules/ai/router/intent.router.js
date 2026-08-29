const ROUTES = require("./route.types");

class IntentRouter {
  route(question) {
    const q = question.toLowerCase().trim();

    // ---------- Greetings & Casual Chit-Chat ----------
    const greetingRegex = /^(hi+|hy+|hey+|hello+|hola|namaste|good\s*(morning|afternoon|evening|day)|how\s*are\s*you|how\s*r\s*u|who\s*are\s*you|what\s*is\s*your\s*name|what\s*can\s*you\s*do|help\s*me|sup|yo|greetings)(\b|[?!.,\s])/i;
    if (greetingRegex.test(q) || q === "hi" || q === "hy" || q === "hey" || q === "hello" || q === "how are you" || q === "how r u" || q === "who are you" || q === "what can you do") {
      return ROUTES.GENERAL;
    }

    // ---------- KYC ----------
    if (
      q.includes("kyc") ||
      q.includes("pan") ||
      q.includes("aadhaar") ||
      q.includes("verification")
    ) {
      return ROUTES.KYC;
    }

    // ---------- Portfolio ----------
    if (
      q.includes("portfolio") ||
      q.includes("holding") ||
      q.includes("holdings") ||
      q.includes("profit") ||
      q.includes("loss") ||
      q.includes("pnl") ||
      q.includes("investment") ||
      q.includes("balance") ||
      q.includes("funds")
    ) {
      return ROUTES.PORTFOLIO;
    }

    // ---------- Market ----------
    if (
      q.includes("stock") ||
      q.includes("market") ||
      q.includes("price") ||
      q.includes("share") ||
      q.includes("nifty") ||
      q.includes("sensex") ||
      q.includes("quote")
    ) {
      return ROUTES.MARKET;
    }

    // ---------- Ticket ----------
    if (
      q.includes("ticket") ||
      q.includes("support") ||
      q.includes("complaint")
    ) {
      return ROUTES.TICKET;
    }

    return ROUTES.RAG;
  }
}

module.exports = new IntentRouter();