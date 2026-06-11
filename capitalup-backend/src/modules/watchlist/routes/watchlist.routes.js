const express = require("express");

const authenticate = require(
  "../../../middlewares/auth.middleware"
);

const validate = require(
  "../../../middlewares/validate.middleware"
);

const {
  addWatchlistSchema,
} = require(
  "../validators/watchlist.validator"
);

const {
  addToWatchlist,
  getUserWatchlist,
  deleteFromWatchlist,
} = require(
  "../controllers/watchlist.controller"
);

const router =
  express.Router();

router.post(
  "/",
  authenticate,
  validate(addWatchlistSchema),
  addToWatchlist
);

router.get(
  "/",
  authenticate,
  getUserWatchlist
);

router.delete(
  "/:symbol",
  authenticate,
  deleteFromWatchlist
);

module.exports = router;