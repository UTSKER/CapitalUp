const {
  getKycByUserId,
  findKycByPanNumber,
  findKycByAadhaarNumber,
  createKyc,
  updateKycStatus,
} = require("../repositories/kyc.repository");

const {
  updateUserNameAndLock,
} = require("../../auth/repositories/auth.repository");

async function getKyc(userId) {
  return await getKycByUserId(userId);
}

async function submitKyc({
  userId,
  panFullName,
  panNumber,
  aadhaarNumber,
  bankAccountNumber,
  bankIfsc,
  bankName,
  accountHolder,
}) {
  const existingKyc =
    await getKycByUserId(userId);

  if (existingKyc && existingKyc.kyc_status !== 'NOT_STARTED' && existingKyc.kyc_status !== 'REJECTED') {
    throw new Error(
      "KYC already completed or pending verification"
    );
  }

  const existingPan =
    await findKycByPanNumber(
      panNumber
    );

  if (existingPan && existingPan.user_id !== userId) {
    throw new Error(
      "PAN number already registered to another user"
    );
  }

  const existingAadhaar =
    await findKycByAadhaarNumber(
      aadhaarNumber
    );

  if (existingAadhaar && existingAadhaar.user_id !== userId) {
    throw new Error(
      "Aadhaar number already registered to another user"
    );
  }

  const kyc = await createKyc({
    userId,
    panFullName,
    panNumber,
    aadhaarNumber,
    bankAccountNumber,
    bankIfsc,
    bankName,
    accountHolder,
  });

  await updateUserNameAndLock(
    userId,
    panFullName
  );

  return kyc;
}

async function reviewKyc(userId, status, remarks) {
  if (status !== "APPROVED" && status !== "REJECTED") {
    throw new Error("Invalid status. Must be APPROVED or REJECTED");
  }
  return await updateKycStatus(userId, status, remarks);
}

module.exports = {
  getKyc,
  submitKyc,
  reviewKyc,
};