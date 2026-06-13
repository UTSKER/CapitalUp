const pool = require("../../../config/postgre");

async function getDocumentsByUserId(
  userId
) {
  const result = await pool.query(
    `
      SELECT *
      FROM kyc_documents
      WHERE user_id = $1
    `,
    [userId]
  );

  return result.rows[0];
}

async function createDocuments({
  userId,
  panDocumentUrl,
  aadhaarFrontUrl,
  aadhaarBackUrl,
}) {
  const result = await pool.query(
    `
      INSERT INTO kyc_documents (
        user_id,
        pan_document_url,
        aadhaar_front_url,
        aadhaar_back_url
      )
      VALUES (
        $1,
        $2,
        $3,
        $4
      )
      RETURNING *;
    `,
    [
      userId,
      panDocumentUrl,
      aadhaarFrontUrl,
      aadhaarBackUrl,
    ]
  );

  return result.rows[0];
}

module.exports = {
  getDocumentsByUserId,
  createDocuments,
};