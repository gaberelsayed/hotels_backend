const express = require("express");
const router = express.Router();
const { requireSignin, isAuth } = require("../controllers/auth");

const { userById } = require("../controllers/user");
const {
	processPayment,
	processPaymentWithCommission,
	processSubscription,
} = require("../controllers/stripe");

// Stripe payment routes
router.post("/stripe/payment/:reservationId", processPayment);
router.post("/stripe/commission-payment", processPaymentWithCommission);

// Stripe subscription routes
router.post("/stripe/subscription", requireSignin, isAuth, processSubscription);

// User parameter to automatically load user data
router.param("userId", userById);

module.exports = router;
