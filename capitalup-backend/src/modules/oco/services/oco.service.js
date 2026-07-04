const {
  lockPendingStopOrderByLinkedLimitId,
  cancelPendingStopOrderById,
} = require(
  "../../stop-order/repositories/stopOrder.repository"
);

const {
  lockPendingLimitOrderById,
  cancelPendingLimitOrderById,
} = require(
  "../../limit-order/repositories/limitOrder.repository"
);

const {
  createNotification,
} = require(
  "../../notification/services/notification.service"
);

// Both helpers run INSIDE the caller's transaction (client) and do NOT
// touch the matching engine — the caller removes the returned order
// from the in-memory engine after COMMIT.

async function cancelLinkedStopForLimitOrder(
  limitOrderId,
  reason,
  client
) {
  const stopOrder =
    await lockPendingStopOrderByLinkedLimitId(
      limitOrderId,
      client
    );

  if (!stopOrder) {
    return null;
  }

  const cancelled =
    await cancelPendingStopOrderById(
      stopOrder.id,
      client
    );

  if (!cancelled) {
    return null;
  }

  await createNotification({
    userId: cancelled.userId,
    title:
      "Stop Order Cancelled (OCO)",
    message:
      `Your ${cancelled.side} stop order for ${cancelled.symbol} was auto-cancelled because ${reason}. Quantity: ${cancelled.quantity}. Stop Price: ₹${cancelled.stopPrice}.`,
  }, client);

  return cancelled;
}

async function cancelLinkedLimitForStopOrder(
  stopOrder,
  reason,
  client
) {
  if (!stopOrder.linkedLimitOrderId) {
    return null;
  }

  const limitOrder =
    await lockPendingLimitOrderById(
      stopOrder.linkedLimitOrderId,
      client
    );

  if (!limitOrder) {
    return null;
  }

  const cancelled =
    await cancelPendingLimitOrderById(
      limitOrder.id,
      client
    );

  if (!cancelled) {
    return null;
  }

  await createNotification({
    userId: cancelled.userId,
    title:
      "Limit Order Cancelled (OCO)",
    message:
      `Your ${cancelled.side} limit order for ${cancelled.symbol} was auto-cancelled because ${reason}. Quantity: ${cancelled.quantity}. Limit Price: ₹${cancelled.limitPrice}.`,
  }, client);

  return cancelled;
}

module.exports = {
  cancelLinkedStopForLimitOrder,
  cancelLinkedLimitForStopOrder,
};
