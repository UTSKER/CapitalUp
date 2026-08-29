const kycService = require("../../../kyc/services/kyc.service");

class KYCTool {
  async execute({ user }) {
    const userId = user?.userId || user?.id;
    if (!userId) {
      return {
        type: "KYC",
        data: {
          exists: false,
          status: "NOT_STARTED",
        },
      };
    }

    const kyc = await kycService.getKyc(userId);

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