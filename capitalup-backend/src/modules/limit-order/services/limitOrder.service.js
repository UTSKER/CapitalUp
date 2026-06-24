const {
  createLimitOrder,
  getUserLimitOrders,
  cancelLimitOrder,
  getPendingSellQuantity,
} = require(
  "../repositories/limitOrder.repository"
);

const {
  findHoldingBySymbol,
} = require(
  "../../portfolio/repositories/portfolio.repository"
);

const {
  findStockBySymbol,
} = require(
  "../../stocks/repositories/stock.repository"
);

async function placeLimitOrder(
  userId,
  data
) {
  const {
    symbol,
    side,
    quantity,
    limit_price,
  } = data;

  if (
    !symbol ||
    !side ||
    !quantity ||
    !limit_price
  ) {
    throw new Error(
      "Missing required fields"
    );
  }

  if (
    side !== "BUY" &&
    side !== "SELL"
  ) {
    throw new Error(
      "Side must be BUY or SELL"
    );
  }

  const stock =
    await findStockBySymbol(
      symbol
    );

  if (!stock) {
    throw new Error(
      "Stock not found"
    );
  }

  if (side === "SELL") {
    const holding =
      await findHoldingBySymbol(
        userId,
        symbol
      );

    if (!holding) {
      throw new Error(
        "You do not own this stock"
      );
    }

    const reservedQuantity =
      await getPendingSellQuantity(
        userId,
        symbol
      );

    const availableQuantity =
      Number(holding.quantity) -
      reservedQuantity;

    if (
      Number(quantity) >
      availableQuantity
    ) {
      throw new Error(
        `Only ${availableQuantity} shares available`
      );
    }
  

    if (
      Number(
        holding.quantity
      ) <
      Number(quantity)
    ) {
      throw new Error(
        "Insufficient holdings"
      );
    }
  }

  return createLimitOrder({
    userId,
    symbol,
    side,
    quantity,
    limitPrice:
      limit_price,
  });
}

async function listLimitOrders(
  userId
) {
  return getUserLimitOrders(
    userId
  );
}

async function removeLimitOrder(
  id,
  userId
) {
  const order =
    await cancelLimitOrder(
      id,
      userId
    );

  if (!order) {
    throw new Error(
      "Limit order not found"
    );
  }

  return order;
}



module.exports = {
  placeLimitOrder,
  listLimitOrders,
  removeLimitOrder,
};