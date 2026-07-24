const {
  createNotification,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require(
  "../repositories/notification.repository"
);

async function getNotifications(
  userId
) {
  return getUserNotifications(
    userId
  );
}

async function readNotification(
  notificationId,
  userId
) {
  const notification =
    await markNotificationRead(
      notificationId,
      userId
    );

  if (!notification) {
    throw new Error(
      "Notification not found"
    );
  }

  return notification;
}

async function readAllNotifications(
  userId
) {
  return markAllNotificationsRead(
    userId
  );
}

async function sendNotification(data) {
  const userId = data.userId || data.user_id;
  if (!userId) {
    console.warn("Skipping notification: No userId provided in event data:", data);
    return null;
  }
  return createNotification({
    userId: BigInt(userId),
    title: data.title || data.event || "New Notification",
    message: data.message || "",
  });
}

module.exports = {
  createNotification,
  getNotifications,
  readNotification,
  readAllNotifications,
  sendNotification,
};