const {
  getNotifications,
  readNotification,
  readAllNotifications,
} = require(
  "../services/notification.service"
);

async function getAll(
  req,
  res
) {
  try {
    const notifications =
      await getNotifications(
        req.user.userId
      );

    return res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
}

async function markRead(
  req,
  res
) {
  try {
    const notification =
      await readNotification(
        req.params.id,
        req.user.userId
      );

    return res.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}

async function markAllRead(
  req,
  res
) {
  try {
    const notifications =
      await readAllNotifications(
        req.user.userId
      );

    return res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
}

module.exports = {
  getAll,
  markRead,
  markAllRead,
};