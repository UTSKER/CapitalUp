const {
  placeLimitOrder,
  listLimitOrders,
  removeLimitOrder,
} = require(
  "../services/limitOrder.service"
);

async function create(
  req,
  res
) {
  try {
    const order =
      await placeLimitOrder(
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
      await listLimitOrders(
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
      await removeLimitOrder(
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