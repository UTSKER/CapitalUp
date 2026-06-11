const express = require("express");
const cors = require("cors");

const authRoutes = require(
  "./modules/auth/routes/auth.routes"
);

const profileRoutes = require(
  "./modules/profile/routes/profile.routes"
);

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/profile", profileRoutes);


// KYC Routes
const kycRoutes = require(
  "./modules/kyc/routes/kyc.routes"
);

app.use("/kyc", kycRoutes);

// Watchlist Routes
const watchlistRoutes = require(
  "./modules/watchlist/routes/watchlist.routes"
);

app.use(
  "/watchlist",
  watchlistRoutes
);


module.exports = app;
