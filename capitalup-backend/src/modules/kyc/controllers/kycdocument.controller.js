const {
  uploadDocuments,
  getDocuments,
} = require(
  "../services/kycdocument.service"
);

async function uploadKycDocuments(
  req,
  res
) {
  try {
    const userId =
      req.user.userId;

    const panDocumentUrl = req.files?.pan_document?.[0]?.path || null;
    const aadhaarFrontUrl = req.files?.aadhaar_front?.[0]?.path || null;
    const aadhaarBackUrl = req.files?.aadhaar_back?.[0]?.path || null;
    const signatureDocumentUrl = req.files?.signature_document?.[0]?.path || null;

    const documents =
      await uploadDocuments({
        userId,
        panDocumentUrl,
        aadhaarFrontUrl,
        aadhaarBackUrl,
        signatureDocumentUrl,
      });

    return res.status(201).json({
      success: true,
      data: documents,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
}

async function getKycDocuments(
  req,
  res
) {
  try {
    const docs =
      await getDocuments(
        req.user.userId
      );

    return res.status(200).json({
      success: true,
      data: docs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
}

module.exports = {
  uploadKycDocuments,
  getKycDocuments,
};
