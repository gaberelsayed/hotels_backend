/** @format */

const express = require("express");
const router = express.Router();

const { userById } = require("../controllers/user");
const {
	generateToken,
	processPayment,
	processSubscription,
	gettingBraintreeDataById,
	processSubscriptionUpdate,
	gettingBraintreeDataById_Admin,
	gettingCurrencyConversion,
} = require("../controllers/braintree");

router.get("/braintree/getToken", generateToken);

router.post("/braintree/payment/:reservationId", processPayment);

router.post("/braintree/subscription/:userId", processSubscription);

router.get("/braintree/gettingData/:userId/:planId", gettingBraintreeDataById);
router.get("/currencyapi/:saudimoney", gettingCurrencyConversion);

router.get(
	"/admin/braintree/gettingData/:userId/:planId",
	gettingBraintreeDataById_Admin
);

router.post(
	"/braintree/updating-payment/:userId/:subId",
	processSubscriptionUpdate
);

router.param("userId", userById);

module.exports = router;
