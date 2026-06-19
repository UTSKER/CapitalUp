const {
  addStock,
  removeStock,
  listStocks,

  getPendingKycs,
  getKycDetails,
  approveUserKyc,
  rejectUserKyc,
} = require(
  "../services/admin.service"
);

/* =========================
   STOCK MANAGEMENT
========================= */

async function createStock(
  req,
  res
) {
  try {
    const stock =
      await addStock(
        req.body
      );

    return res.status(201).json({
      success: true,
      data: stock,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}

async function getStocks(
  req,
  res
) {
  try {
    const stocks =
      await listStocks();

    return res.status(200).json({
      success: true,
      data: stocks,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
}

async function deleteStock(
  req,
  res
) {
  try {
    const { symbol } =
      req.params;

    const stock =
      await removeStock(
        symbol
      );

    return res.status(200).json({
      success: true,
      data: stock,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message:
        error.message,
    });
  }
}

/* =========================
   KYC MANAGEMENT
========================= */

async function getPendingKyc(
  req,
  res
) {
  try {
    const kycs =
      await getPendingKycs();

    return res.status(200).json({
      success: true,
      data: kycs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
}

async function getKyc(
  req,
  res
) {
  try {
    const { userId } =
      req.params;

    const kyc =
      await getKycDetails(
        userId
      );

    return res.status(200).json({
      success: true,
      data: kyc,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message:
        error.message,
    });
  }
}

async function approveKyc(
  req,
  res
) {
  try {
    const { userId } =
      req.params;

    const result =
      await approveUserKyc(
        userId
      );

    return res.status(200).json({
      success: true,
      message:
        "KYC approved successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}

async function rejectKyc(
  req,
  res
) {
  try {
    const { userId } =
      req.params;

    const {
      remarks,
      reason,
    } =
      req.body;

    const result =
      await rejectUserKyc(
        userId,
        remarks || reason
      );

    return res.status(200).json({
      success: true,
      message:
        "KYC rejected successfully",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}

module.exports = {
  // stocks
  createStock,
  getStocks,
  deleteStock,

  // kyc
  getPendingKyc,
  getKyc,
  approveKyc,
  rejectKyc,
};
