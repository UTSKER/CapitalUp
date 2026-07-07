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
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

const paymentRoutes = require("./modules/payments/routes/payments.routes");

app.use("/auth", authRoutes);
app.use("/profile", profileRoutes);
app.use("/payments", paymentRoutes);


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

// search and quote routes
const stockRoutes = require(
  "./modules/stocks/routes/stock.routes"
);

app.use("/stocks", stockRoutes);

// Portfolio Routes
const portfolioRoutes = require(
  "./modules/portfolio/routes/portfolio.routes"
);

app.use("/portfolio", portfolioRoutes);

// Order Routes
const orderRoutes = require(
  "./modules/orders/routes/order.routes.js"
);

app.use("/orders",orderRoutes);


// Admin Routes
const adminRoutes =
  require(
    "./modules/admin/routes/admin.routes"
  );

  app.use(
  "/admin",
  adminRoutes
);


// limit - orderes routes

const limitorderRoutes =  
require(
      "./modules/limit-order/routes/limitOrder.routes.js"
);

app.use(
  "/limit-orders",
  limitorderRoutes
);

// stop - orders routes

const stopOrderRoutes =
require(
      "./modules/stop-order/routes/stopOrder.routes.js"
);

app.use(
  "/stop-orders",
  stopOrderRoutes
);

// notifications route
app.use(
  "/notifications",
  require(
    "./modules/notification/routes/notification.routes"
  )
);


module.exports = app;
