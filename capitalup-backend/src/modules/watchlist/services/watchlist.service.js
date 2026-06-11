const {
  addStockToWatchlist,
  getWatchlistByUserId,
  removeStockFromWatchlist,
  findWatchlistStock,
} = require(
  "../repositories/watchlist.repository"
);

async function addStock(
  userId,
  symbol
) {
  const existing =
    await findWatchlistStock(
      userId,
      symbol
    );

  if (existing) {
    throw new Error(
      "Stock already exists in watchlist"
    );
  }

  return addStockToWatchlist(
    userId,
    symbol
  );
}

async function getWatchlist(
  userId
) {
  return getWatchlistByUserId(
    userId
  );
}

async function removeStock(
  userId,
  symbol
) {
  const existing =
    await findWatchlistStock(
      userId,
      symbol
    );

  if (!existing) {
    throw new Error(
      "Stock not found in watchlist"
    );
  }

  return removeStockFromWatchlist(
    userId,
    symbol
  );
}

module.exports = {
  addStock,
  getWatchlist,
  removeStock,
};