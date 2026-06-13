const {
  addStock,
  getWatchlist,
  removeStock,
} = require(
  "../services/watchlist.service"
);

async function addToWatchlist(
  req,
  res
) {
  try {
    const stock =
      await addStock(
        req.user.userId,
        req.body.symbol
      );

    return res.status(201).json({
      success: true,
      data: stock,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

async function getUserWatchlist(
  req,
  res
) {
  try {
    const stocks =
      await getWatchlist(
        req.user.userId
      );

    return res.status(200).json({
      success: true,
      data: stocks,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function deleteFromWatchlist(
  req,
  res
) {
  try {
    const stock =
      await removeStock(
        req.user.userId,
        req.params.symbol
      );

    return res.status(200).json({
      success: true,
      data: stock,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  addToWatchlist,
  getUserWatchlist,
  deleteFromWatchlist,
};