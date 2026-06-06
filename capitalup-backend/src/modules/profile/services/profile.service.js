const {
  getProfileByUserId,
  updateProfile,
} = require("../repositories/profile.repository");

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

  const updatedProfile =
    await updateProfile(
      userId,
      mergedProfile
    );

  return updatedProfile;
}

module.exports = {
  getUserProfile,
  updateUserProfile,
};