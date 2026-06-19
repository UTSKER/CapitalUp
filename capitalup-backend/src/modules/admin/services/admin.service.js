const {
  getAllStocks,
  createStock,
  deleteStock,

  getPendingKycRequests,
  getKycByUserId,
  approveKyc,
  rejectKyc,
} = require(
  "../repositories/admin.repository"
);

/* =========================
   STOCK MANAGEMENT
========================= */

async function addStock(
  stockData
) {
  const {
    symbol,
    company_name,
    exchange,
    instrument_type,
  } = stockData;

  if (
    !symbol ||
    !company_name ||
    !exchange ||
    !instrument_type
  ) {
    throw new Error(
      "Missing required fields"
    );
  }

  return createStock(
    stockData
  );
}

async function listStocks() {
  return getAllStocks();
}

async function removeStock(
  symbol
) {
  const stock =
    await deleteStock(
      symbol
    );

  if (!stock) {
    throw new Error(
      "Stock not found"
    );
  }

  return stock;
}

/* =========================
   KYC MANAGEMENT
========================= */

async function getPendingKycs() {
  return getPendingKycRequests();
}

async function getKycDetails(
  userId
) {
  const kyc =
    await getKycByUserId(
      userId
    );

  if (!kyc) {
    throw new Error(
      "KYC record not found"
    );
  }

  return kyc;
}

async function approveUserKyc(
  userId
) {
  const kyc =
    await getKycByUserId(
      userId
    );

  if (!kyc) {
    throw new Error(
      "KYC record not found"
    );
  }

  if (
    kyc.kyc_status ===
    "APPROVED"
  ) {
    throw new Error(
      "KYC already approved"
    );
  }

  if (
    kyc.kyc_status !==
    "PENDING"
  ) {
    throw new Error(
      "Only pending KYC records can be approved"
    );
  }

  return approveKyc(
    userId
  );
}

async function rejectUserKyc(
  userId,
  remarks
) {
  const kyc =
    await getKycByUserId(
      userId
    );

  if (!kyc) {
    throw new Error(
      "KYC record not found"
    );
  }

  if (
    kyc.kyc_status ===
    "REJECTED"
  ) {
    throw new Error(
      "KYC already rejected"
    );
  }

  if (
    kyc.kyc_status !==
    "PENDING"
  ) {
    throw new Error(
      "Only pending KYC records can be rejected"
    );
  }

  return rejectKyc(
    userId,
    remarks
  );
}

module.exports = {
  // stocks
  addStock,
  listStocks,
  removeStock,

  // kyc
  getPendingKycs,
  getKycDetails,
  approveUserKyc,
  rejectUserKyc,
};
