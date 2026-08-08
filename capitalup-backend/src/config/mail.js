require("dotenv").config({ override: true });

async function sendBrevoEmail({ from, to, subject, text, html }) {
  if (!process.env.BREVO_API_KEY) {
    console.warn("BREVO_API_KEY is not configured. Skipping email delivery.");
    return { skipped: true };
  }

  const payload = {
    sender: {
      name: from.name || "CapitalUp",
      email: from.email || process.env.SMTP_FROM || "noreply@capitalup.com",
    },
    to: [
      {
        email: to,
      },
    ],
    subject: subject,
    htmlContent: html,
    textContent: text,
  };

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Brevo Email Error:", data);
      throw new Error(`Failed to send email: ${data.message || response.statusText}`);
    }

    console.log("Email sent successfully via Brevo API", data);
    return data;
  } catch (error) {
    console.error("Email Delivery Failed:", error);
    throw error;
  }
}

module.exports = {
  sendBrevoEmail,
};
