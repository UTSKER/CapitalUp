const express = require("express");
const router = express.Router();

const controller = require("../controllers/testKafka.controller");

router.post("/test", controller.publishTest);

module.exports = router;