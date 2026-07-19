const ROUTES = require("../router/route.types");

module.exports = {
  [ROUTES.RAG]: require("./rag/rag.tool"),
  [ROUTES.KYC]: require("./kyc/kyc.tool"),
  [ROUTES.PORTFOLIO]: require("./portfolio/portfolio.tool"),
  [ROUTES.MARKET]: require("./market/market.tool"),
  [ROUTES.TICKET]: require("./ticket/ticket.tool"),
};