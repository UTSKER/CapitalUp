const pool = require("../../../config/postgre");

async function findUserByEmail(email) {
  const result = await pool.query(
    `
      SELECT *
      FROM users
      WHERE email = $1
    `,
    [email]
  );

  return result.rows[0];
}

async function findUserByMobile(mobileNumber) {
  const result = await pool.query(
    `
      SELECT *
      FROM users
      WHERE mobile_number = $1
    `,
    [mobileNumber]
  );

  return result.rows[0];
}

async function findUserByIdentifier(identifier) {
  const result = await pool.query(
    `
      SELECT *
      FROM users
      WHERE email = $1
         OR mobile_number = $1
    `,
    [identifier]
  );

  return result.rows[0];
}

async function createUser({
  full_name,
  email,
  mobile_number,
  password_hash,
}) {
  const result = await pool.query(
    `
      INSERT INTO users (
        full_name,
        email,
        mobile_number,
        password_hash
      )
      VALUES (
        $1,
        $2,
        $3,
        $4
      )
      RETURNING *;
    `,
    [
      full_name,
      email,
      mobile_number,
      password_hash,
    ]
  );

  return result.rows[0];
}

async function markEmailVerified(email) {
  const result = await pool.query(
    `
      UPDATE users
      SET is_email_verified = TRUE,
          updated_at = CURRENT_TIMESTAMP
      WHERE email = $1
      RETURNING *;
    `,
    [email]
  );

  return result.rows[0];
}

async function findUserById(userId) {
  const result = await pool.query(
    `
      SELECT *
      FROM users
      WHERE user_id = $1
    `,
    [userId]
  );

  return result.rows[0];
}

async function markMobileVerified(userId) {
  const result = await pool.query(
    `
      UPDATE users
      SET is_mobile_verified = TRUE,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING *;
    `,
    [userId]
  );

  return result.rows[0];
}

async function updateUserPassword(userId, passwordHash) {
  const result = await pool.query(
    `
      UPDATE users
      SET password_hash = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2
      RETURNING *;
    `,
    [passwordHash, userId]
  );

  return result.rows[0];
}

async function updateUserNameAndLock(
  userId,
  fullName
) {
  const result = await pool.query(
    `
      UPDATE users
      SET
        full_name = $1,
        is_name_locked = TRUE
      WHERE user_id = $2
      RETURNING *;
    `,
    [fullName, userId]
  );

  return result.rows[0];
}

module.exports = {
  findUserByEmail,
  findUserByMobile,
  findUserByIdentifier,
  createUser,
  markEmailVerified,
  findUserById,
  markMobileVerified,
  updateUserPassword,
  updateUserNameAndLock,
};
