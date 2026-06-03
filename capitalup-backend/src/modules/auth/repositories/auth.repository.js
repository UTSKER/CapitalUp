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

module.exports = {
  findUserByEmail,
  findUserByMobile,
  createUser,
};