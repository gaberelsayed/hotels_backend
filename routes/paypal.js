const express = require("express");
const router = express.Router();
const paypalController = require("../controllers/paypal");

// Route to process a payment
router.post(
	"/process-payment-via-paypal/:reservationId",
	paypalController.processPayment_SAR
);

module.exports = router;
