const transporter = require("../../config/mail");

const from = process.env.SMTP_FROM || "CapitalUp <noreply@capitalup.com>";
const supportEmail = process.env.SUPPORT_EMAIL || "support@capitalup.com";

function getOTPEmailTemplate(userName, otpCode, expiryMinutes) {
  return `<!doctype html>
<html><body style="margin:0;background:#090c10;color:#eef2f7;font-family:Arial,sans-serif">
<div style="max-width:560px;margin:32px auto;background:#121720;border:1px solid #283243;border-radius:14px;overflow:hidden">
  <div style="padding:24px;background:#2563eb;font-size:22px;font-weight:700">CapitalUp</div>
  <div style="padding:32px">
    <h1 style="font-size:22px">Hi ${userName || "Investor"},</h1>
    <p style="color:#aeb8c7;line-height:1.6">Use this one-time password to securely sign in to CapitalUp.</p>
    <div style="margin:28px 0;padding:20px;text-align:center;background:#0b1017;border-radius:10px;font-size:34px;font-weight:700;letter-spacing:8px;color:#6ea3ff">${otpCode}</div>
    <p style="color:#aeb8c7">This code is valid for ${expiryMinutes} minutes.</p>
    <p style="color:#f5b942;font-weight:700">Never share your OTP with anyone.</p>
  </div>
  <div style="padding:20px 32px;color:#78869a;font-size:12px;border-top:1px solid #283243">Need help? Contact ${supportEmail}</div>
</div></body></html>`;
}

function getSuccessEmailTemplate(userName) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#090c10;color:#eef2f7;padding:32px">
<div style="max-width:560px;margin:auto;background:#121720;padding:32px;border-radius:14px">
<h1>Email verified</h1><p>Hi ${userName || "Investor"}, your CapitalUp email was verified successfully.</p>
<p>If this was not you, contact ${supportEmail} immediately.</p>
</div></body></html>`;
}

async function sendVerificationEmail(email, userName, otpCode, expiryMinutes = 10) {
  return transporter.sendMail({
    from,
    to: email,
    subject: `${otpCode} is your CapitalUp verification code`,
    text: `Hi ${userName || "Investor"}, your CapitalUp OTP is ${otpCode}. It is valid for ${expiryMinutes} minutes. Never share your OTP. Support: ${supportEmail}`,
    html: getOTPEmailTemplate(userName, otpCode, expiryMinutes),
  });
}

async function sendVerificationSuccessEmail(email, userName) {
  return transporter.sendMail({
    from,
    to: email,
    subject: "Your CapitalUp email is verified",
    text: `Hi ${userName || "Investor"}, your CapitalUp email was verified successfully.`,
    html: getSuccessEmailTemplate(userName),
  });
}

module.exports = {
  sendVerificationEmail,
  sendVerificationSuccessEmail,
  getOTPEmailTemplate,
  getSuccessEmailTemplate,
};
