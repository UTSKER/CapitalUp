const {
  getKycByUserId,
  findKycByPanNumber,
  findKycByAadhaarNumber,
  createKyc,
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
}) {
  const existingKyc =
    await getKycByUserId(userId);

  if (existingKyc) {
    throw new Error(
      "KYC already completed"
    );
  }

  const existingPan =
    await findKycByPanNumber(
      panNumber
    );

  if (existingPan) {
    throw new Error(
      "PAN number already registered"
    );
  }

  const existingAadhaar =
    await findKycByAadhaarNumber(
      aadhaarNumber
    );

  if (existingAadhaar) {
    throw new Error(
      "Aadhaar number already registered"
    );
  }

  const kyc = await createKyc({
    userId,
    panFullName,
    panNumber,
    aadhaarNumber,
  });

  await updateUserNameAndLock(
    userId,
    panFullName
  );

  return kyc;
}

module.exports = {
  getKyc,
  submitKyc,
};