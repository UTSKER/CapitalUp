const {
  placeOrder,
  getMyOrders,
  getSingleOrder,
} = require(
  "../services/order.service"
);

async function create(
  req,
  res
) {
  try {
    const userId =
      req.user.userId;

    const {
      symbol,
      side,
      quantity,
      clientOrderId,
    } = req.body;

    const order =
      await placeOrder({
        userId,
        symbol,
        side,
        quantity:
          Number(quantity),
        clientOrderId,
      });

    return res.status(201).json({
      success: true,
      message:
        "Order executed successfully",
      data: order,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message:
        error.message,
      code: error.code,
    });
  }
}

async function getOrders(
  req,
  res
) {
  try {
    const userId =
      req.user.userId;

    const orders =
      await getMyOrders(
        userId
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

async function getOrder(
  req,
  res
) {
  try {
    const { id } =
      req.params;

    const order =
      await getSingleOrder(
        id
      );

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message:
        error.message,
    });
  }
}

async function getTimeline(req, res) {
  try {
    const { getOrderTimeline } = require("../../risk/services/risk.service");
    const timeline = await getOrderTimeline(req.params.id, req.user.userId);
    return res.status(200).json({ success: true, data: timeline });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  create,
  getOrders,
  getOrder,
  getTimeline,
};
