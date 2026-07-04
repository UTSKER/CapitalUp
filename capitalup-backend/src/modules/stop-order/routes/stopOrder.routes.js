const express = require("express");
const router = express.Router();

const { getAll,create,cancel } = require("../controllers/stopOrder.controller")
const authenticate = require("../../../middlewares/auth.middleware.js")

router.use(authenticate);

router.post(
    "/",create
);

router.get(
    "/",getAll
);

router.delete(
    "/:id",cancel
);

module.exports = router;
