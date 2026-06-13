const {
  addStockToWatchlist,
  getWatchlistByUserId,
  removeStockFromWatchlist,
  findWatchlistStock,
} = require(
  "../repositories/watchlist.repository"
);

const {
  addActiveSymbol,
  getStockData,
} = require(
  "../../market-data/repositories/marketdata.repository"
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

  await addActiveSymbol(symbol);

  return addStockToWatchlist(
    userId,
    symbol
  );
}

async function getWatchlist(
  userId
) {
  const watchlist =
    await getWatchlistByUserId(
      userId
    );

  return Promise.all(
    watchlist.map(async (stock) => {
      const marketData =
        await getStockData(
          stock.symbol
        );

      return {
        ...stock,
        price:
          marketData?.price ?? null,
        high:
          marketData?.high ?? null,
        low:
          marketData?.low ?? null,
        previousClose:
          marketData?.previousClose ?? null,
        lastUpdated:
          marketData?.updatedAt ?? null,
      };
    })
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
