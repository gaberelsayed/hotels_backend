const express = require("express");
const router = express.Router();
const { userById } = require("../controllers/user");
const { processSquarePayment } = require("../controllers/square");

// square payment routes
router.post("/square/payment/:reservationId", processSquarePayment);

// User parameter to automatically load user data
router.param("userId", userById);

module.exports = router;
