const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { requireSignin, isAuth } = require("../controllers/auth");
const { userById } = require("../controllers/user");
const {
	processPayment,
	processPaymentWithCommission,
	processSubscription,
	createPaymentIntent,
} = require("../controllers/stripe");

// Stripe payment routes
router.post("/stripe/payment/:reservationId", processPayment);
router.post("/stripe/commission-payment", processPaymentWithCommission);

// Stripe subscription routes
router.post("/stripe/subscription", processSubscription);

// Route for creating Payment Intent and returning the client secret
router.post("/create-payment-intent", createPaymentIntent);

// User parameter to automatically load user data
router.param("userId", userById);

module.exports = router;
