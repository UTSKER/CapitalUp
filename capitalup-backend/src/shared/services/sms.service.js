const axios = require("axios");

async function sendMobileOTP(phoneNumber, code) {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  const fast2smsKey = process.env.FAST2SMS_API_KEY;

  const otpMessage = `Your CapitalUp verification code is: ${code}`;
  console.log(`[SMS Service] Attempting to send OTP: ${code} to ${phoneNumber}`);

  let sent = false;
  let responseData = null;

  // 1. Try Twilio if configured
  if (twilioSid && twilioAuthToken && twilioPhoneNumber) {
    try {
      let twilioTo = phoneNumber;
      const digitsOnly = phoneNumber.replace(/\D/g, "");
      if (digitsOnly.length === 10) {
        twilioTo = `+91${digitsOnly}`;
      } else if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
        twilioTo = `+${digitsOnly}`;
      } else if (!phoneNumber.startsWith("+")) {
        twilioTo = `+${digitsOnly}`;
      }

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const authHeader = `Basic ${Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString("base64")}`;
      
      const params = new URLSearchParams();
      params.append("To", twilioTo);
      params.append("From", twilioPhoneNumber);
      params.append("Body", otpMessage);

      console.log(`[SMS Service] Sending via Twilio to ${twilioTo}...`);
      const twilioRes = await axios.post(twilioUrl, params.toString(), {
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        timeout: 5000
      });
      
      console.log(`[SMS Service] Twilio send success: ${twilioRes.data.sid}`);
      responseData = twilioRes.data;
      sent = true;
    } catch (twilioError) {
      const errMsg = twilioError.response?.data?.message || twilioError.message;
      console.error(`[SMS Service] Twilio Send Failed: ${errMsg}`);
    }
  }

  // 2. Try Fast2SMS if configured and Twilio wasn't used/successful
  if (!sent && fast2smsKey) {
    try {
      const cleanedNumber = phoneNumber.replace(/\D/g, "");
      const targetNumber = (cleanedNumber.length === 12 && cleanedNumber.startsWith("91")) 
        ? cleanedNumber.slice(2) 
        : cleanedNumber;

      const url = "https://www.fast2sms.com/dev/bulkV2";
      const payload = {
        variables_values: code,
        route: "otp",
        numbers: targetNumber
      };

      console.log(`[SMS Service] Sending via Fast2SMS to ${targetNumber}...`);
      const response = await axios.post(url, payload, {
        headers: {
          "authorization": fast2smsKey,
          "Content-Type": "application/json"
        },
        timeout: 5000
      });
      
      console.log("[SMS Service] Fast2SMS send success");
      responseData = response.data;
      sent = true;
    } catch (fast2smsError) {
      const errMsg = fast2smsError.response?.data?.message || fast2smsError.message;
      console.error(`[SMS Service] Fast2SMS Send Failed: ${errMsg}`);
    }
  }

  // 3. Fallback / testing log output
  if (!sent) {
    console.log(`\n=== MOBILE OTP LOG (TESTING MODE) ===\nTo: ${phoneNumber}\nCode: ${code}\n======================================\n`);
    responseData = { status: "logged", code };
  }

  return responseData;
}

module.exports = {
  sendMobileOTP,
};
