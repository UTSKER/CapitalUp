const express = require("express");
const cors = require("cors");

const authRoutes = require(
  "./modules/auth/routes/auth.routes"
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

module.exports = app;
