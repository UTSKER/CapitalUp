const {
  getKyc,
  submitKyc,
  reviewKyc,
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
      bank_account_number,
      bank_ifsc,
      bank_name,
      account_holder,
    } = req.body;

    const kyc =
      await submitKyc({
        userId,
        panFullName: pan_full_name,
        panNumber: pan_number,
        aadhaarNumber: aadhaar_number,
        bankAccountNumber: bank_account_number,
        bankIfsc: bank_ifsc,
        bankName: bank_name,
        accountHolder: account_holder,
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

async function reviewKycDetails(req, res) {
  try {
    const userId = req.user.userId;
    const { status, remarks } = req.body;

    const kyc = await reviewKyc(userId, status, remarks);

    return res.status(200).json({
      success: true,
      message: `KYC updated to ${status} successfully`,
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
  reviewKycDetails,
};