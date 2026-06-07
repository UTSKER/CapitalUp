const pool = require("../../../config/postgre");

async function getKycByUserId(userId) {
  const result = await pool.query(
    `
      SELECT *
      FROM kyc
      WHERE user_id = $1
    `,
    [userId]
  );

  return result.rows[0];
}

async function findKycByPanNumber(
  panNumber
) {
  const result = await pool.query(
    `
      SELECT *
      FROM kyc
      WHERE pan_number = $1
    `,
    [panNumber]
  );

  return result.rows[0];
}

async function findKycByAadhaarNumber(
  aadhaarNumber
) {
  const result = await pool.query(
    `
      SELECT *
      FROM kyc
      WHERE aadhaar_number = $1
    `,
    [aadhaarNumber]
  );

  return result.rows[0];
}

async function createKyc({
  userId,
  panFullName,
  panNumber,
  aadhaarNumber,
}) {
  const result = await pool.query(
    `
      INSERT INTO kyc (
        user_id,
        pan_full_name,
        pan_number,
        aadhaar_number,
        status
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        'APPROVED'
      )
      RETURNING *;
    `,
    [
      userId,
      panFullName,
      panNumber,
      aadhaarNumber,
    ]
  );

  return result.rows[0];
}

module.exports = {
  getKycByUserId,
  findKycByPanNumber,
  findKycByAadhaarNumber,
  createKyc,
};