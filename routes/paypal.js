const express = require("express");
const { payPalMerchantCreation } = require("../controllers/paypal");
const router = express.Router();

// Route to process a payment
router.post("/create-a-vendor-paypal", payPalMerchantCreation);

module.exports = router;
