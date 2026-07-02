const express = require("express");

const {
  getProfile,
  updateProfile,
} = require("../controllers/profile.controller");

const authenticate = require(
  "../../../middlewares/auth.middleware"
);

const { publisher } = require("../../../config/redis");

const validate = require(
  "../../../middlewares/validate.middleware"
);

const {
  updateProfileSchema,
} = require("../validators/profile.validator");

const router = express.Router();

router.get(
  "/",
  authenticate,
  getProfile
);

router.patch(
  "/",
  authenticate,validate(updateProfileSchema),
  updateProfile
);

module.exports = router;