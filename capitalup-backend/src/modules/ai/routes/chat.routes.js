const { Router } = require("express");
const { chat } = require("../controllers/chat.controller.js");
const authenticate = require("../../../middlewares/auth.middleware.js"); // <-- adjust path/name

const router = Router();

router.post("/chat", authenticate, chat);

module.exports = router;