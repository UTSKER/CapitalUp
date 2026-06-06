const axios = require("axios");

async function sendMobileOTP(phoneNumber, code) {
  const fast2smsKey = process.env.FAST2SMS_API_KEY;
  if (!fast2smsKey) {
    // Return mock response for testing if no API key is configured
    return { status: "logged", code };
  }

  const cleanedNumber = phoneNumber.replace(/\D/g, "");
  // Ensure the phone number is 10 digits
  const targetNumber = (cleanedNumber.length === 12 && cleanedNumber.startsWith("91")) 
    ? cleanedNumber.slice(2) 
    : cleanedNumber;

  const url = "https://www.fast2sms.com/dev/bulkV2";
  const payload = {
    variables_values: code,
    route: "otp",
    numbers: targetNumber
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        "authorization": fast2smsKey,
        "Content-Type": "application/json"
      },
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    throw new Error(`Fast2SMS Send Failed: ${errorMsg}`);
  }
}

module.exports = {
  sendMobileOTP,
};
