const express = require("express");

const router = express.Router();

const {
  register,
} = require("../controllers/auth.controller");

const validate = require("../../../middlewares/validate.middleware");

const {
  registerSchema,
} = require("../validators/auth.validator");

router.post(
  "/register",
  validate(registerSchema),
  register
);

module.exports = router;