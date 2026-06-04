const express = require("express");

const authRoutes = require(
  "./modules/auth/routes/auth.routes"
);

const app = express();
const errorMiddleware = require("./middlewares/error.middleware");

app.use(express.json());
app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", process.env.FRONTEND_ORIGIN || "http://localhost:5173");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use("/auth", authRoutes);
app.use("/api/v1/auth", authRoutes);

app.use(errorMiddleware);

module.exports = app;
