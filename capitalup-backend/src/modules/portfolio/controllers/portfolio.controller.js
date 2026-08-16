const {
  buyStock,
  sellStock,
  getPortfolio,
  getPortfolioPerformance,
  getPortfolioTopMovers,
} = require(
  "../services/portfolio.service"
);

async function buy(
  req,
  res
) {
  try {
    const userId =
      req.user.userId;

    const {
      symbol,
      quantity,
      price,
    } = req.body;

    const holding =
      await buyStock({
        userId,
        symbol,
        quantity:
          Number(quantity),
        price:
          Number(price),
      });

    return res.status(200).json({
      success: true,
      message:
        "Stock purchased successfully",
      data: holding,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}

async function sell(
  req,
  res
) {
  try {
    const userId =
      req.user.userId;

    const {
      symbol,
      quantity,
    } = req.body;

    const holding =
      await sellStock({
        userId,
        symbol,
        quantity:
          Number(quantity),
      });

    return res.status(200).json({
      success: true,
      message:
        "Stock sold successfully",
      data: holding,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}

async function getUserPortfolio(
  req,
  res
) {
  try {
    const userId =
      req.user.userId;

    const portfolio =
      await getPortfolio(
        userId
      );

    return res.status(200).json({
      success: true,
      data: portfolio,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
}

async function getPerformance(req, res) {
  try {
    const userId = req.user.userId;
    const period = req.query.period || "1M";

    const performance = await getPortfolioPerformance(userId, period);

    return res.status(200).json({
      success: true,
      data: performance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function getTopMovers(req, res) {
  try {
    const userId = req.user.userId;

    const movers = await getPortfolioTopMovers(userId);

    return res.status(200).json({
      success: true,
      data: movers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  buy,
  sell,
  getUserPortfolio,
  getPerformance,
  getTopMovers,
};