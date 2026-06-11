const {
  getDocumentsByUserId,
  createDocuments,
} = require(
  "../repositories/kycDocument.repository"
);

async function uploadDocuments({
  userId,
  panDocumentUrl,
  aadhaarFrontUrl,
  aadhaarBackUrl,
}) {
  const existing =
    await getDocumentsByUserId(
      userId
    );

  if (existing) {
    throw new Error(
      "Documents already uploaded"
    );
  }

  return createDocuments({
    userId,
    panDocumentUrl,
    aadhaarFrontUrl,
    aadhaarBackUrl,
  });
}

async function getDocuments(userId) {
  return getDocumentsByUserId(
    userId
  );
}

module.exports = {
  uploadDocuments,
  getDocuments,
};