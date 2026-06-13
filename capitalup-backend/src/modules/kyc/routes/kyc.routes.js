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

const upload = require(
  "../../../middlewares/upload.middleware"
);

const {
  uploadKycDocuments,
  getKycDocuments,
} = require(
  "../controllers/kycdocument.controller.js"
);

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

router.post(
  "/documents",
  authenticate,

  upload.fields([
    {
      name: "pan_document",
      maxCount: 1,
    },
    {
      name: "aadhaar_front",
      maxCount: 1,
    },
    {
      name: "aadhaar_back",
      maxCount: 1,
    },
  ]),

  uploadKycDocuments
);

router.get(
  "/documents",
  authenticate,
  getKycDocuments
);

module.exports = router;