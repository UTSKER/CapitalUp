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

module.exports = {
  createNotification,
  getNotifications,
  readNotification,
  readAllNotifications,
};