const { Router } = require("express");
const { chat } = require("../controllers/chat.controller.js");

const router = Router();

router.post("/chat", chat);

module.exports = router;