const {
  placeStopOrder,
  listStopOrders,
  removeStopOrder,
} = require(
  "../services/stopOrder.service"
);

async function create(
  req,
  res
) {
  try {
    const order =
      await placeStopOrder(
        req.user.userId,
        req.body
      );

    return res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}

async function getAll(
  req,
  res
) {
  try {
    const orders =
      await listStopOrders(
        req.user.userId
      );

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
}

async function cancel(
  req,
  res
) {
  try {
    const order =
      await removeStopOrder(
        req.params.id,
        req.user.userId
      );

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}

module.exports = {
  create,
  getAll,
  cancel,
};
