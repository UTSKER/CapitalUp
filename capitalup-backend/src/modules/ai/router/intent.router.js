const ROUTES = require("./route.types");

class IntentRouter {
  route(question) {
    const q = question.toLowerCase();

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
      q.includes("investment")
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
      q.includes("sensex")
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