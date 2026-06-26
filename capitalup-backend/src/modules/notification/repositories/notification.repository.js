const pool = require(
  "../../../config/postgre"
);

async function createNotification({
  userId,
  title,
  message,
}, db = pool) {
  const result =
    await db.query(
      `
      INSERT INTO notifications (
        user_id,
        title,
        message
      )
      VALUES (
        $1,
        $2,
        $3
      )
      RETURNING *;
      `,
      [
        userId,
        title,
        message,
      ]
    );

  return result.rows[0];
}

async function getUserNotifications(
  userId
) {
  const result =
    await pool.query(
      `
      SELECT *
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

  return result.rows;
}

async function markNotificationRead(
  notificationId,
  userId
) {
  const result =
    await pool.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE
        id = $1
        AND user_id = $2
      RETURNING *;
      `,
      [
        notificationId,
        userId,
      ]
    );

  return result.rows[0];
}

async function markAllNotificationsRead(
  userId
) {
  const result =
    await pool.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1
      RETURNING *;
      `,
      [userId]
    );

  return result.rows;
}

module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
