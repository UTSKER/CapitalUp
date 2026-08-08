const express = require("express");
const router = express.Router();

// This endpoint is critical for Serverless deployments (like Render)
// A service like cron-job.org should ping this every 10 minutes to prevent the server from sleeping.
router.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: "CapitalUp Matching Engine is awake and healthy.",
  });
});

module.exports = router;
