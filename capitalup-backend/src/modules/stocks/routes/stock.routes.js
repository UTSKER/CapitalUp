const express = require("express");

const {
  search,
  getQuote,
} = require("../controllers/stock.controller");

const router = express.Router();

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

module.exports = router;