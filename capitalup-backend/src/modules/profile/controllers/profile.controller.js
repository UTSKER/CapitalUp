const {
  getUserProfile,
  updateUserProfile,
} = require("../services/profile.service");

async function getProfile(req, res) {
  try {
    const userId = req.user.userId;

    const profile =
      await getUserProfile(userId);

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error(
      "Get Profile Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function updateProfile(req, res) {
  try {
    const userId = req.user.userId;

    const updatedProfile =
      await updateUserProfile(
        userId,
        req.body
      );

    return res.status(200).json({
      success: true,
      data: updatedProfile,
    });
  } catch (error) {
    console.error(
      "Update Profile Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  getProfile,
  updateProfile,
};