const pool = require("../../../config/postgre");

async function getDocumentsByUserId(userId) {
  const result = await pool.query(
    `
      SELECT 
        p.pan_front AS pan_document_url,
        a.aadhaar_front AS aadhaar_front_url,
        a.aadhaar_back AS aadhaar_back_url,
        s.signature_image
      FROM users u
      LEFT JOIN pan_details p ON u.user_id = p.user_id
      LEFT JOIN aadhaar_details a ON u.user_id = a.user_id
      LEFT JOIN signature_details s ON u.user_id = s.user_id
      WHERE u.user_id = $1
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
  signatureDocumentUrl,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Update pan_details
    if (panDocumentUrl) {
      await client.query(
        `
          UPDATE pan_details
          SET pan_front = $1, updated_at = NOW()
          WHERE user_id = $2
        `,
        [panDocumentUrl, userId]
      );
    }

    // 2. Update aadhaar_details
    if (aadhaarFrontUrl || aadhaarBackUrl) {
      await client.query(
        `
          UPDATE aadhaar_details
          SET 
            aadhaar_front = COALESCE($1, aadhaar_front),
            aadhaar_back = COALESCE($2, aadhaar_back),
            updated_at = NOW()
          WHERE user_id = $3
        `,
        [aadhaarFrontUrl, aadhaarBackUrl, userId]
      );
    }

    // 3. Update signature_details
    if (signatureDocumentUrl) {
      await client.query(
        `
          UPDATE signature_details
          SET signature_image = $1, updated_at = NOW()
          WHERE user_id = $2
        `,
        [signatureDocumentUrl, userId]
      );
    }

    await client.query("COMMIT");
    
    return {
      pan_document_url: panDocumentUrl,
      aadhaar_front_url: aadhaarFrontUrl,
      aadhaar_back_url: aadhaarBackUrl,
      signature_image: signatureDocumentUrl
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getDocumentsByUserId,
  createDocuments,
};