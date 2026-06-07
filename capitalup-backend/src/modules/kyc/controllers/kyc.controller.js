const {
  getKyc,
  submitKyc,
} = require("../services/kyc.service");

async function getKycDetails(
  req,
  res
) {
  try {
    const userId =
      req.user.userId;

    const kyc =
      await getKyc(userId);

    return res.status(200).json({
      success: true,
      data: kyc,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function submitKycDetails(
  req,
  res
) {
  try {
    const userId =
      req.user.userId;

    const {
      pan_full_name,
      pan_number,
      aadhaar_number,
    } = req.body;

    const kyc =
      await submitKyc({
        userId,
        panFullName: pan_full_name,
        panNumber: pan_number,
        aadhaarNumber:
          aadhaar_number,
      });

    return res.status(201).json({
      success: true,
      message:
        "KYC submitted successfully",
      data: kyc,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  getKycDetails,
  submitKycDetails,
};