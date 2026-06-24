const {
  getProfileByUserId,
  updateProfile,
} = require("../repositories/profile.repository");
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

  if (existingProfile.kyc_status === "APPROVED") {
    const identityDocumentEdit = ["pan_full_name", "pan_number", "aadhaar_number"]
      .some((field) => incomingData[field] !== undefined);
    const protectedProfileEdit = ["full_name", "father_name", "date_of_birth", "dob"]
      .some((field) => {
        if (incomingData[field] === undefined) return false;
        const storedField = field === "date_of_birth" ? "dob" : field;
        const incoming = String(incomingData[field]).slice(0, 10);
        const stored = String(existingProfile[storedField] ?? "").slice(0, 10);
        return incoming !== stored;
      });
    if (identityDocumentEdit || protectedProfileEdit) {
      throw new Error("Verified identity fields cannot be modified after KYC approval");
    }
  }

  // Registered email/mobile are intentionally not accepted by this endpoint.
  const userUpdates = [];
  const userValues = [];
  let paramIndex = 1;

  if (
    incomingData.full_name &&
    incomingData.full_name !== existingProfile.full_name
  ) {
    if (existingProfile.is_name_locked) {
      throw new Error(
        "Name cannot be modified after KYC approval"
      );
    }

    userUpdates.push(
      `full_name = $${paramIndex++}`
    );
    userValues.push(
      incomingData.full_name
    );
  }

  if (userUpdates.length > 0) {
    userValues.push(userId);
    const setClause = userUpdates.join(", ");
    await pool.query(
      `
        UPDATE users
        SET ${setClause},
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $${paramIndex}
      `,
      userValues
    );
  }

  const mergedProfile = {
    full_name:
      incomingData.full_name ??
      existingProfile.full_name,

    father_name:
      incomingData.father_name ??
      existingProfile.father_name,

    mother_name:
      incomingData.mother_name ??
      existingProfile.mother_name,

    dob:
      incomingData.dob ??
      incomingData.date_of_birth ??
      existingProfile.dob,

    gender:
      incomingData.gender ??
      existingProfile.gender,

    occupation:
      incomingData.occupation ??
      existingProfile.occupation,

    income:
      incomingData.income ??
      incomingData.annual_income ??
      existingProfile.income,

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

    marital_status:
      incomingData.marital_status ??
      existingProfile.marital_status,
  };

  await updateProfile(
    userId,
    mergedProfile
  );

  const bankFields = ["bank_name", "bank_account_number", "bank_ifsc", "account_holder"];
  if (bankFields.some((field) => incomingData[field] !== undefined)) {
    await pool.query(
      `
        UPDATE bank_accounts
        SET bank_name = COALESCE($1, bank_name),
            account_number = COALESCE($2, account_number),
            ifsc_code = COALESCE($3, ifsc_code),
            account_holder = COALESCE($4, account_holder),
            updated_at = NOW()
        WHERE user_id = $5
      `,
      [
        incomingData.bank_name,
        incomingData.bank_account_number,
        incomingData.bank_ifsc,
        incomingData.account_holder,
        userId,
      ]
    );
  }

  if (incomingData.pan_full_name || incomingData.pan_number) {
    await pool.query(
      `UPDATE pan_details
       SET pan_name = COALESCE($1, pan_name), pan_number = COALESCE($2, pan_number), updated_at = NOW()
       WHERE user_id = $3`,
      [incomingData.pan_full_name, incomingData.pan_number, userId]
    );
  }
  if (incomingData.aadhaar_number) {
    await pool.query(
      `UPDATE aadhaar_details SET aadhaar_number = $1, updated_at = NOW() WHERE user_id = $2`,
      [incomingData.aadhaar_number, userId]
    );
  }

  return getProfileByUserId(userId);
}

module.exports = {
  getUserProfile,
  updateUserProfile,
};
