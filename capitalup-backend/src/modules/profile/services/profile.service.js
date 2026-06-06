const {
  getProfileByUserId,
  updateProfile,
} = require("../repositories/profile.repository");
const {
  findUserByMobile,
} = require("../../auth/repositories/auth.repository");
const pool = require("../../../config/postgre");

async function getUserProfile(userId) {
  const profile =
    await getProfileByUserId(userId);

  if (!profile) {
    throw new Error("User not found");
  }

  return profile;
}

async function updateUserProfile(
  userId,
  incomingData
) {
  const existingProfile =
    await getProfileByUserId(userId);

  if (!existingProfile) {
    throw new Error("User not found");
  }

  // Check if users table needs updates (full_name, mobile_number)
  const userUpdates = [];
  const userValues = [];
  let paramIndex = 1;

  if (incomingData.full_name && incomingData.full_name !== existingProfile.full_name) {
    userUpdates.push(`full_name = $${paramIndex++}`);
    userValues.push(incomingData.full_name);
  }

  if (incomingData.mobile_number && incomingData.mobile_number !== existingProfile.mobile_number) {
    // Check if new mobile number is already taken
    const existingMobile = await findUserByMobile(incomingData.mobile_number);
    if (existingMobile && existingMobile.id !== userId) {
      throw new Error("Mobile number is already registered to another account");
    }
    userUpdates.push(`mobile_number = $${paramIndex++}`);
    userUpdates.push(`is_mobile_verified = FALSE`);
    userValues.push(incomingData.mobile_number);
  }

  if (userUpdates.length > 0) {
    userValues.push(userId);
    const setClause = userUpdates.join(", ");
    await pool.query(
      `
        UPDATE users
        SET ${setClause},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
      `,
      userValues
    );
  }

  const mergedProfile = {
    date_of_birth:
      incomingData.date_of_birth ??
      existingProfile.date_of_birth,

    gender:
      incomingData.gender ??
      existingProfile.gender,

    occupation:
      incomingData.occupation ??
      existingProfile.occupation,

    annual_income:
      incomingData.annual_income ??
      existingProfile.annual_income,

    address:
      incomingData.address ??
      existingProfile.address,

    city:
      incomingData.city ??
      existingProfile.city,

    state:
      incomingData.state ??
      existingProfile.state,

    pincode:
      incomingData.pincode ??
      existingProfile.pincode,
  };

  await updateProfile(
    userId,
    mergedProfile
  );

  return getProfileByUserId(userId);
}

module.exports = {
  getUserProfile,
  updateUserProfile,
};