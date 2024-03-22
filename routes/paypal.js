const express = require("express");
const paypalController = require("../controllers/paypal"); // Adjust the path as needed
const router = express.Router();

// Route to create an order
router.post("/create-order", paypalController.createOrder);

// Route to capture an order after payment approval
router.post("/capture-order", paypalController.captureOrder);

module.exports = router;
