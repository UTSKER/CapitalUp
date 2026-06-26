const {
  searchStocks,
  getStockPrice,
  getAllStocks,
  getStockHistory,
} = require("../services/stock.service");

async function search(req, res) {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const stocks = await searchStocks(q);

    return res.status(200).json({
      success: true,
      data: stocks,
    });
  } catch (error) {
    console.error("Search Stock Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function getQuote(req, res) {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Stock symbol is required",
      });
    }

    const stock = await getStockPrice(symbol);

    return res.status(200).json({
      success: true,
      data: stock,
    });
  } catch (error) {
    console.error("Get Quote Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function getAll(req, res) {
  try {
    const stocks = await getAllStocks();
    return res.status(200).json({
      success: true,
      data: stocks,
    });
  } catch (error) {
    console.error("Get All Stocks Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function getHistory(req, res) {
  try {
    const { symbol } = req.params;
    const history = await getStockHistory(symbol);
    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Get History Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  search,
  getQuote,
  getAll,
  getHistory,
};