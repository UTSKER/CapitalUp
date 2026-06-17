const pool = require("../../../config/postgre");

async function getProfileByUserId(userId) {
  const query = `
    SELECT
      u.user_id,
      u.full_name,
      u.email,
      u.mobile_number,
      u.is_email_verified,
      u.is_mobile_verified,
      u.is_name_locked,

      p.dob,
      p.gender,
      p.occupation,
      p.income,
      p.father_name,
      p.mother_name,
      p.address,
      p.city,
      p.state,
      p.pincode

    FROM users u

    LEFT JOIN user_profile p
      ON u.user_id = p.user_id

    WHERE u.user_id = $1
  `;

  const result = await pool.query(
    query,
    [userId]
  );

  return result.rows[0];
}

async function updateProfile(
  userId,
  profileData
) {
  const {
    full_name,
    father_name,
    mother_name,
    dob,
    gender,
    occupation,
    income,
    address,
    city,
    state,
    pincode,
  } = profileData;

  const query = `
    INSERT INTO user_profile (
      user_id,
      full_name,
      father_name,
      mother_name,
      dob,
      gender,
      occupation,
      income,
      address,
      city,
      state,
      pincode
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
    )

    ON CONFLICT (user_id)

    DO UPDATE SET
      full_name = EXCLUDED.full_name,
      father_name = EXCLUDED.father_name,
      mother_name = EXCLUDED.mother_name,
      dob = EXCLUDED.dob,
      gender = EXCLUDED.gender,
      occupation = EXCLUDED.occupation,
      income = EXCLUDED.income,
      address = EXCLUDED.address,
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      pincode = EXCLUDED.pincode,
      updated_at = NOW()

    RETURNING *;
  `;

  const result = await pool.query(
    query,
    [
      userId,
      full_name,
      father_name,
      mother_name,
      dob,
      gender,
      occupation,
      income,
      address,
      city,
      state,
      pincode,
    ]
  );

  return result.rows[0];
}

module.exports = {
  getProfileByUserId,
  updateProfile,
};