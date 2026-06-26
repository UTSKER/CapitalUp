const express =
  require("express");

const router =
  express.Router();

const authMiddleware =
  require(
    "../../../middlewares/auth.middleware"
  );

const {
  getAll,
  markRead,
  markAllRead,
} = require(
  "../controllers/notification.controller"
);

router.use(
  authMiddleware
);

router.get(
  "/",
  getAll
);

router.patch(
  "/:id/read",
  markRead
);

router.patch(
  "/read-all",
  markAllRead
);

module.exports =
  router;