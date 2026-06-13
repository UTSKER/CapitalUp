const { z } = require("zod");

const addWatchlistSchema = z.object({
  symbol: z
    .string()
    .min(1)
    .max(30),
});

module.exports = {
  addWatchlistSchema,
};