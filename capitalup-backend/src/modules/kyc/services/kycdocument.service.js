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
  signatureDocumentUrl,
}) {
  return createDocuments({
    userId,
    panDocumentUrl,
    aadhaarFrontUrl,
    aadhaarBackUrl,
    signatureDocumentUrl,
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