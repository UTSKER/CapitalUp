const pool = require(
  "../../../config/postgre"
);

/* =========================
   STOCK MANAGEMENT
========================= */

async function getAllStocks() {
  const result =
    await pool.query(
      `
      SELECT *
      FROM stocks
      ORDER BY company_name;
      `
    );

  return result.rows;
}

async function createStock({
  symbol,
  company_name,
  exchange,
  instrument_type,
  sector,
}) {
  const result =
    await pool.query(
      `
      INSERT INTO stocks (
        symbol,
        company_name,
        exchange,
        instrument_type,
        sector
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5
      )
      RETURNING *;
      `,
      [
        symbol,
        company_name,
        exchange,
        instrument_type,
        sector,
      ]
    );

  return result.rows[0];
}

async function deleteStock(
  symbol
) {
  const result =
    await pool.query(
      `
      DELETE FROM stocks
      WHERE symbol = $1
      RETURNING *;
      `,
      [symbol]
    );

  return result.rows[0];
}

/* =========================
   KYC MANAGEMENT
========================= */

async function getPendingKycRequests() {
  const result =
    await pool.query(`
      SELECT
        k.user_id,
        u.full_name,
        u.email,
        k.kyc_status,
        k.submitted_at
      FROM kyc k
      JOIN users u
        ON k.user_id = u.user_id
      WHERE k.kyc_status = 'PENDING'
      ORDER BY k.submitted_at ASC
    `);

  return result.rows;
}

async function getKycByUserId(
  userId
) {
  const result =
    await pool.query(
      `
      SELECT
        u.user_id,
        u.full_name,
        u.email,

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

        k.kyc_status,
        k.submitted_at,
        k.approved_at,
        k.remarks

      FROM kyc k

      JOIN users u
        ON k.user_id = u.user_id

      LEFT JOIN pan_details p
        ON k.pan_id = p.pan_id

      LEFT JOIN aadhaar_details a
        ON k.aadhaar_id = a.aadhaar_id

      LEFT JOIN signature_details s
        ON k.signature_id = s.signature_id

      LEFT JOIN bank_accounts b
        ON k.bank_id = b.bank_id

      WHERE k.user_id = $1
      `,
      [userId]
    );

  return result.rows[0];
}

async function approveKyc(
  userId
) {
  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    const result =
      await client.query(
      `
      UPDATE kyc
      SET
        kyc_status = 'APPROVED',
        approved_at = NOW(),
        remarks = NULL,
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING *;
      `,
      [userId]
    );

    const kyc =
      result.rows[0];

    if (!kyc) {
      await client.query(
        "ROLLBACK"
      );
      return null;
    }

    await client.query(
      `
      UPDATE pan_details
      SET verification = 'APPROVED',
          updated_at = NOW()
      WHERE pan_id = $1;
      `,
      [kyc.pan_id]
    );

    await client.query(
      `
      UPDATE aadhaar_details
      SET verification = 'APPROVED',
          updated_at = NOW()
      WHERE aadhaar_id = $1;
      `,
      [kyc.aadhaar_id]
    );

    await client.query(
      `
      UPDATE signature_details
      SET verification = 'APPROVED',
          updated_at = NOW()
      WHERE signature_id = $1;
      `,
      [kyc.signature_id]
    );

    const panResult =
      await client.query(
        `
        SELECT pan_name
        FROM pan_details
        WHERE pan_id = $1;
        `,
        [kyc.pan_id]
      );

    const panName =
      panResult.rows[0]?.pan_name;

    if (panName) {
      await client.query(
        `
        UPDATE users
        SET full_name = $1,
            is_name_locked = TRUE,
            updated_at = NOW()
        WHERE user_id = $2;
        `,
        [panName, userId]
      );

      await client.query(
        `
        INSERT INTO user_profile (
          user_id,
          full_name,
          updated_at
        )
        VALUES (
          $1,
          $2,
          NOW()
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
          full_name = EXCLUDED.full_name,
          updated_at = NOW();
        `,
        [userId, panName]
      );
    }

    await client.query(
      "COMMIT"
    );

    return kyc;
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );
    throw error;
  } finally {
    client.release();
  }
}

async function rejectKyc(
  userId,
  remarks
) {
  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    const result =
      await client.query(
      `
      UPDATE kyc
      SET
        kyc_status = 'REJECTED',
        remarks = $2,
        approved_at = NULL,
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING *;
      `,
      [userId, remarks]
    );

    const kyc =
      result.rows[0];

    if (!kyc) {
      await client.query(
        "ROLLBACK"
      );
      return null;
    }

    await client.query(
      `
      UPDATE pan_details
      SET verification = 'REJECTED',
          updated_at = NOW()
      WHERE pan_id = $1;
      `,
      [kyc.pan_id]
    );

    await client.query(
      `
      UPDATE aadhaar_details
      SET verification = 'REJECTED',
          updated_at = NOW()
      WHERE aadhaar_id = $1;
      `,
      [kyc.aadhaar_id]
    );

    await client.query(
      `
      UPDATE signature_details
      SET verification = 'REJECTED',
          updated_at = NOW()
      WHERE signature_id = $1;
      `,
      [kyc.signature_id]
    );

    await client.query(
      "COMMIT"
    );

    return kyc;
  } catch (error) {
    await client.query(
      "ROLLBACK"
    );
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  // stocks
  getAllStocks,
  createStock,
  deleteStock,

  // kyc
  getPendingKycRequests,
  getKycByUserId,
  approveKyc,
  rejectKyc,
};
