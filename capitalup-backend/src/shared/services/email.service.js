const mailTransporter = require("../../config/mail");

const fromAddress =
  process.env.SMTP_FROM || "CapitalUp <noreply@capitalup.com>";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getOTPEmailTemplate(
  userName,
  otpCode,
  expiryMinutes = 10
) {
  const safeName = escapeHtml(userName || "there");
  const safeOtp = escapeHtml(otpCode);

  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f6f8fb;font-family:Arial,sans-serif;color:#172033;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:24px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e6ebf2;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="background:#0f766e;color:#ffffff;padding:24px;font-size:24px;font-weight:700;">
                    CapitalUp
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <h1 style="margin:0 0 12px;font-size:22px;color:#172033;">Hi ${safeName},</h1>
                    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">Use this one-time password to verify your CapitalUp email address.</p>
                    <div style="margin:24px 0;padding:18px;background:#ecfdf5;border:1px solid #99f6e4;border-radius:8px;text-align:center;font-size:34px;font-weight:800;letter-spacing:6px;color:#0f766e;">
                      ${safeOtp}
                    </div>
                    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;"><strong>Valid for ${expiryMinutes} minutes.</strong></p>
                    <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#4b5563;">Never share your OTP with anyone. CapitalUp will never ask for it over phone, chat, or email.</p>
                    <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">Need help? Contact support at support@capitalup.com.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function getSuccessEmailTemplate(userName) {
  const safeName = escapeHtml(userName || "there");

  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f6f8fb;font-family:Arial,sans-serif;color:#172033;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:24px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e6ebf2;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="background:#0f766e;color:#ffffff;padding:24px;font-size:24px;font-weight:700;">CapitalUp</td>
                </tr>
                <tr>
                  <td style="padding:28px;">
                    <h1 style="margin:0 0 12px;font-size:22px;color:#172033;">You're verified, ${safeName}</h1>
                    <p style="margin:0;font-size:15px;line-height:1.6;">Your CapitalUp email address has been verified successfully.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

async function sendMail({ to, subject, text, html }) {
  if (!process.env.SMTP_HOST) {
    console.warn(
      "SMTP_HOST is not configured. Skipping email delivery."
    );
    return { skipped: true };
  }

  return mailTransporter.sendMail({
    from: fromAddress,
    to,
    subject,
    text,
    html,
  });
}

async function sendVerificationEmail(
  email,
  userName,
  otpCode,
  expiryMinutes = 10
) {
  return sendMail({
    to: email,
    subject: "Verify your CapitalUp email",
    text: `Hi ${userName || "there"}, your CapitalUp OTP is ${otpCode}. It is valid for ${expiryMinutes} minutes. Never share your OTP.`,
    html: getOTPEmailTemplate(
      userName,
      otpCode,
      expiryMinutes
    ),
  });
}

async function sendVerificationSuccessEmail(
  email,
  userName
) {
  return sendMail({
    to: email,
    subject: "CapitalUp email verified",
    text: `Hi ${userName || "there"}, your CapitalUp email address has been verified successfully.`,
    html: getSuccessEmailTemplate(userName),
  });
}

module.exports = {
  sendVerificationEmail,
  sendVerificationSuccessEmail,
  getOTPEmailTemplate,
  getSuccessEmailTemplate,
};
