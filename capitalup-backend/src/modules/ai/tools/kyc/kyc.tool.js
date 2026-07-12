const kycService = require("../../../kyc/services/kyc.service");

class KYCTool {
  async execute({ user }) {
    if (!user) {
      throw new Error("Authentication required.");
    }

    const kyc = await kycService.getKyc(user.id);

    if (!kyc) {
      return {
        type: "KYC",
        data: {
          exists: false,
          status: "NOT_STARTED",
        },
      };
    }

    return {
      type: "KYC",
      data: {
        exists: true,
        status: kyc.kyc_status,
        remarks: kyc.remarks,
        panFullName: kyc.pan_full_name,
        bankName: kyc.bank_name,
        accountHolder: kyc.account_holder,
        submittedAt: kyc.created_at,
        updatedAt: kyc.updated_at,
      },
    };
  }
}

module.exports = new KYCTool();