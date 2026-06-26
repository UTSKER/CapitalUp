const express = require("express");

const {
  search,
  getQuote,
  getAll,
  getHistory,
} = require("../controllers/stock.controller");

const router = express.Router();

/*
 * List all active stocks
 * GET /stocks
 */
router.get("/", getAll);

/*
 * Search Stocks
 * GET /stocks/search?q=tcs
 */
router.get("/search", search);

/*
 * Get Stock Quote
 * GET /stocks/quote/NSE:TCS
 */
router.get("/quote/:symbol", getQuote);

/*
 * Get Stock History
 * GET /stocks/:symbol/history
 */
router.get("/:symbol/history", getHistory);

module.exports = router;