const pool = require("../../../config/postgre");

async function getProfileByUserId(userId) {
  const query = `
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.mobile_number,
      u.is_email_verified,

      p.date_of_birth,
      p.gender,
      p.occupation,
      p.annual_income,
      p.address,
      p.city,
      p.state,
      p.pincode

    FROM users u

    LEFT JOIN profiles p
      ON u.id = p.user_id

    WHERE u.id = $1
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
    date_of_birth,
    gender,
    occupation,
    annual_income,
    address,
    city,
    state,
    pincode,
  } = profileData;

  const query = `
    INSERT INTO profiles (
      user_id,
      date_of_birth,
      gender,
      occupation,
      annual_income,
      address,
      city,
      state,
      pincode
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9
    )

    ON CONFLICT (user_id)

    DO UPDATE SET
      date_of_birth = EXCLUDED.date_of_birth,
      gender = EXCLUDED.gender,
      occupation = EXCLUDED.occupation,
      annual_income = EXCLUDED.annual_income,
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
      date_of_birth,
      gender,
      occupation,
      annual_income,
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