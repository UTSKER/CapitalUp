const express = require("express");

const authenticate = require(
  "../../../middlewares/auth.middleware"
);

const validate = require(
  "../../../middlewares/validate.middleware"
);

const {
  submitKycSchema,
} = require("../validators/kyc.validator");

const {
  getKycDetails,
  submitKycDetails,
} = require("../controllers/kyc.controller");

const router =
  express.Router();

router.get(
  "/",
  authenticate,
  getKycDetails
);

router.post(
  "/",
  authenticate,
  validate(submitKycSchema),
  submitKycDetails
);

module.exports = router;