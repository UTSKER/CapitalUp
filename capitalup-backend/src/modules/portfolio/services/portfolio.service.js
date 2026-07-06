const { getUserBalance } = require("./balance.service");

const {
  findHoldingBySymbol,
  createHolding,
  updateHolding,
  deleteHolding,
  getUserHoldings,
} = require(
  "../repositories/portfolio.repository"
);

const {
  findStockBySymbol,
} = require(
  "../../stocks/repositories/stock.repository"
);

const {redisClient} = require(
  "../../../config/redis"
);

async function buyStock({
  userId,
  symbol,
  quantity,
  price,
}, dbClient) {
  const stock =
    await findStockBySymbol(symbol);

  if (!stock) {
    throw new Error(
      "Invalid stock symbol"
    );
  }

  const existingHolding =
    await findHoldingBySymbol(
      userId,
      symbol,
      dbClient
    );

  if (!existingHolding) {
    return createHolding({
      userId,
      symbol,
      quantity,
      averageBuyPrice: price,
    }, dbClient);
  }

  const oldQuantity =
    existingHolding.quantity;

  const oldAveragePrice =
    Number(
      existingHolding.average_buy_price
    );

  const newQuantity =
    oldQuantity + quantity;

  const newAveragePrice =
    (
      oldQuantity *
        oldAveragePrice +
      quantity * price
    ) / newQuantity;

  return updateHolding({
    holdingId:
      existingHolding.id,
    quantity: newQuantity,
    averageBuyPrice:
      newAveragePrice,
  }, dbClient);
}

async function sellStock({
  userId,
  symbol,
  quantity,
}, dbClient) {
  const holding =
    await findHoldingBySymbol(
      userId,
      symbol,
      dbClient
    );

  if (!holding) {
    throw new Error(
      "Holding not found"
    );
  }

  if (
    quantity >
    holding.quantity
  ) {
    throw new Error(
      "Insufficient quantity"
    );
  }

  const remainingQuantity =
    holding.quantity -
    quantity;

  if (
    remainingQuantity === 0
  ) {
    return deleteHolding(
      userId,
      symbol,
      dbClient
    );
  }

  return updateHolding({
    holdingId: holding.id,
    quantity:
      remainingQuantity,
    averageBuyPrice:
      holding.average_buy_price,
  }, dbClient);
}

async function getPortfolio(
  userId
) {
  const holdings =
    await getUserHoldings(
      userId
    );

  const balance = await getUserBalance(userId);

  let totalInvested = 0;

  let currentValue = 0;

  const portfolio =
    await Promise.all(
      holdings.map(
        async (holding) => {
          const cachedPrice =
            await redisClient.get(
              `stock:${holding.symbol}`
            );

          let currentPrice = 0;

          if (cachedPrice) {
            const parsed =
              JSON.parse(
                cachedPrice
              );

            currentPrice =
              Number(
                parsed.price
              );
          }

          const investedValue =
            Number(
              holding.quantity
            ) *
            Number(
              holding.average_buy_price
            );

          const currentHoldingValue =
            Number(
              holding.quantity
            ) * currentPrice;

          const profitLoss =
            currentHoldingValue -
            investedValue;

          const profitLossPercentage =
            investedValue === 0
              ? 0
              : (
                  (profitLoss /
                    investedValue) *
                  100
                ).toFixed(2);

          totalInvested +=
            investedValue;

          currentValue +=
            currentHoldingValue;

          return {
            symbol:
              holding.symbol,

            quantity:
              holding.quantity,

            average_buy_price:
              Number(
                holding.average_buy_price
              ),

            current_price:
              currentPrice,

            invested_value:
              investedValue,

            current_value:
              currentHoldingValue,

            profit_loss:
              profitLoss,

            profit_loss_percentage:
              Number(
                profitLossPercentage
              ),
          };
        }
      )
    );

  const totalProfitLoss =
    currentValue -
    totalInvested;

  const totalProfitLossPercentage =
    totalInvested === 0
      ? 0
      : (
          (totalProfitLoss /
            totalInvested) *
          100
        ).toFixed(2);

  return {
    summary: {
      total_invested:
        totalInvested,

      current_value:
        currentValue,

      total_profit_loss:
        totalProfitLoss,

      total_profit_loss_percentage:
        Number(
          totalProfitLossPercentage
        ),
      balance,
    },

    holdings: portfolio,
  };
}

module.exports = {
  buyStock,
  sellStock,
  getPortfolio,
};
