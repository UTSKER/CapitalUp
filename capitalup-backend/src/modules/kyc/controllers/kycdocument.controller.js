const {
  uploadDocuments,
  getDocuments,
} = require(
  "../services/kycDocument.service"
);

async function uploadKycDocuments(
  req,
  res
) {
  try {
    const userId =
      req.user.userId;

    const documents =
      await uploadDocuments({
        userId,

        panDocumentUrl:
          req.files.pan_document[0]
            .path,

        aadhaarFrontUrl:
          req.files
            .aadhaar_front[0].path,

        aadhaarBackUrl:
          req.files
            .aadhaar_back[0].path,
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