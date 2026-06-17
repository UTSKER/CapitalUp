require("dotenv").config({ override: true });
const cloudinary = require("./src/config/cloudinary");

async function checkCloudinary() {
  console.log("Checking Cloudinary credentials...");
  console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME || "(Not Set)");
  console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "******" : "(Not Set)");
  console.log("API Secret:", process.env.CLOUDINARY_API_SECRET ? "******" : "(Not Set)");

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error("\n❌ Error: Missing Cloudinary environment variables in capitalup-backend/.env!");
    console.log("Please sign up on cloudinary.com and copy your credentials into the .env file.");
    process.exit(1);
  }

  try {
    // Attempt to ping Cloudinary API
    const result = await cloudinary.api.ping();
    console.log("\n✅ Success! Cloudinary is properly configured and connected.");
    console.log("API Ping response:", result);
  } catch (error) {
    console.error("\n❌ Error: Cloudinary connection test failed!");
    console.error("Reason:", error.message || error);
    console.log("\nPlease verify that your cloud name, API key, and API secret are correct.");
  }
}

checkCloudinary();
