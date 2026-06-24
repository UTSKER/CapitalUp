const pool = require("../../../config/postgre");

async function getKycByUserId(userId) {
  const result = await pool.query(
    `
      SELECT 
        k.kyc_id,
        k.user_id,
        k.kyc_status,
        k.submitted_at,
        k.approved_at,
        k.remarks,
        k.created_at,
        k.updated_at,
        p.pan_number,
        p.pan_name,
        p.pan_front,
        p.pan_front AS pan_document_url,
        p.verification AS pan_verification,
        a.aadhaar_number,
        a.aadhaar_front,
        a.aadhaar_front AS aadhaar_front_url,
        a.aadhaar_back,
        a.aadhaar_back AS aadhaar_back_url,
        a.verification AS aadhaar_verification,
        s.signature_image,
        s.signature_image AS signature_document_url,
        s.verification AS signature_verification,
        b.bank_name,
        b.account_number,
        b.ifsc_code,
        b.account_holder,
        u.email,
        u.mobile_number,
        up.dob,
        up.gender,
        up.marital_status,
        up.occupation,
        up.income,
        up.father_name,
        up.mother_name,
        up.address,
        up.city,
        up.state,
        up.pincode
      FROM kyc k
      JOIN users u ON k.user_id = u.user_id
      LEFT JOIN user_profile up ON k.user_id = up.user_id
      LEFT JOIN pan_details p ON k.pan_id = p.pan_id
      LEFT JOIN aadhaar_details a ON k.aadhaar_id = a.aadhaar_id
      LEFT JOIN signature_details s ON k.signature_id = s.signature_id
      LEFT JOIN bank_accounts b ON k.bank_id = b.bank_id
      WHERE k.user_id = $1
    `,
    [userId]
  );

  return result.rows[0];
}

async function findKycByPanNumber(panNumber) {
  const result = await pool.query(
    `
      SELECT *
      FROM pan_details
      WHERE pan_number = $1
    `,
    [panNumber]
  );

  return result.rows[0];
}

async function findKycByAadhaarNumber(aadhaarNumber) {
  const result = await pool.query(
    `
      SELECT *
      FROM aadhaar_details
      WHERE aadhaar_number = $1
    `,
    [aadhaarNumber]
  );

  return result.rows[0];
}

async function createKyc({
  userId,
  panFullName,
  panNumber,
  aadhaarNumber,
  bankAccountNumber,
  bankIfsc,
  bankName,
  accountHolder,
  profile,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Pan details
    const panRes = await client.query(
      `
        INSERT INTO pan_details (user_id, pan_number, pan_name, verification)
        VALUES ($1, $2, $3, 'PENDING')
        ON CONFLICT (user_id)
        DO UPDATE SET
          pan_number = EXCLUDED.pan_number,
          pan_name = EXCLUDED.pan_name,
          verification = 'PENDING',
          updated_at = NOW()
        RETURNING pan_id;
      `,
      [userId, panNumber, panFullName]
    );
    const panId = panRes.rows[0].pan_id;

    // 2. Aadhaar details
    const aadhaarRes = await client.query(
      `
        INSERT INTO aadhaar_details (user_id, aadhaar_number, verification)
        VALUES ($1, $2, 'PENDING')
        ON CONFLICT (user_id)
        DO UPDATE SET
          aadhaar_number = EXCLUDED.aadhaar_number,
          verification = 'PENDING',
          updated_at = NOW()
        RETURNING aadhaar_id;
      `,
      [userId, aadhaarNumber]
    );
    const aadhaarId = aadhaarRes.rows[0].aadhaar_id;

    // 3. Bank details
    const finalBankName = bankName || "Verified Bank";
    const finalAccountHolder = accountHolder || panFullName;
    const bankRes = await client.query(
      `
        INSERT INTO bank_accounts (user_id, bank_name, account_number, ifsc_code, account_holder)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id)
        DO UPDATE SET
          bank_name = EXCLUDED.bank_name,
          account_number = EXCLUDED.account_number,
          ifsc_code = EXCLUDED.ifsc_code,
          account_holder = EXCLUDED.account_holder,
          updated_at = NOW()
        RETURNING bank_id;
      `,
      [userId, finalBankName, bankAccountNumber, bankIfsc, finalAccountHolder]
    );
    const bankId = bankRes.rows[0].bank_id;

    // 4. Signature details (initialize signature record if not exists)
    const sigRes = await client.query(
      `
        INSERT INTO signature_details (user_id, verification)
        VALUES ($1, 'PENDING')
        ON CONFLICT (user_id)
        DO UPDATE SET
          verification = 'PENDING',
          updated_at = NOW()
        RETURNING signature_id;
      `,
      [userId]
    );
    const signatureId = sigRes.rows[0].signature_id;

    // 5. Persist the personal details entered in the KYC wizard. The account
    // name itself is deliberately changed only by the approval transaction.
    await client.query(
      `
        INSERT INTO user_profile (
          user_id, father_name, mother_name, dob, gender, marital_status,
          occupation, income, address, city, state, pincode, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          father_name = EXCLUDED.father_name,
          mother_name = EXCLUDED.mother_name,
          dob = EXCLUDED.dob,
          gender = EXCLUDED.gender,
          marital_status = EXCLUDED.marital_status,
          occupation = EXCLUDED.occupation,
          income = EXCLUDED.income,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          pincode = EXCLUDED.pincode,
          updated_at = NOW()
        RETURNING profile_id;
      `,
      [
        userId, profile.fatherName, profile.motherName, profile.dob,
        profile.gender, profile.maritalStatus, profile.occupation,
        profile.income, profile.address, profile.city, profile.state,
        profile.pincode,
      ]
    );

    // 6. Central kyc junction record
    const kycRes = await client.query(
      `
        INSERT INTO kyc (user_id, pan_id, aadhaar_id, signature_id, bank_id, kyc_status, submitted_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'PENDING', NOW(), NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          pan_id = EXCLUDED.pan_id,
          aadhaar_id = EXCLUDED.aadhaar_id,
          signature_id = EXCLUDED.signature_id,
          bank_id = EXCLUDED.bank_id,
          kyc_status = 'PENDING',
          submitted_at = NOW(),
          updated_at = NOW()
        RETURNING *;
      `,
      [userId, panId, aadhaarId, signatureId, bankId]
    );

    await client.query("COMMIT");
    return kycRes.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getKycByUserId,
  findKycByPanNumber,
  findKycByAadhaarNumber,
  createKyc,
};
