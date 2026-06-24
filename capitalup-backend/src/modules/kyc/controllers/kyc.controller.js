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
      bank_account_number,
      bank_ifsc,
      bank_name,
      account_holder,
      date_of_birth,
      gender,
      marital_status,
      father_name,
      mother_name,
      occupation,
      annual_income,
      address,
      city,
      state,
      pincode,
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
        profile: {
          dob: date_of_birth,
          gender,
          maritalStatus: marital_status,
          fatherName: father_name,
          motherName: mother_name,
          occupation,
          income: annual_income,
          address,
          city,
          state,
          pincode,
        },
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
