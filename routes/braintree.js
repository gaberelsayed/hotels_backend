/** @format */

const express = require("express");
const router = express.Router();
const { requireSignin, isAuth } = require("../controllers/auth");

const { userById } = require("../controllers/user");
const {
	generateToken,
	processPayment,
	processSubscription,
	gettingBraintreeDataById,
	processSubscriptionUpdate,
	gettingBraintreeDataById_Admin,
	gettingCurrencyConversion,
	updateSubscriptionCard,
	getSubscriptionData,
	getStoredPaymentData,
} = require("../controllers/braintree");

router.get("/braintree/getToken", generateToken);

router.post("/braintree/payment/:reservationId", processPayment);

router.post("/braintree/subscription", processSubscription);

router.get("/braintree/gettingData/:userId/:planId", gettingBraintreeDataById);
router.get("/currencyapi/:saudimoney", gettingCurrencyConversion);

router.get(
	"/admin/braintree/gettingData/:userId/:planId",
	gettingBraintreeDataById_Admin
);

//update Subscription card (used)
router.put("/braintree/update-subscription-card", updateSubscriptionCard);

router.post(
	"/braintree/updating-payment/:userId/:subId",
	processSubscriptionUpdate
);

//to get stored Payment data (used)
router.get(
	"/braintree/payment-data/:userId/:token",
	requireSignin,
	isAuth,
	getStoredPaymentData
);

//to get subscription Payment data (used)
router.get(
	"/braintree/subscription-data/:userId/:subscriptionId",
	requireSignin,
	isAuth,
	getSubscriptionData
);

router.param("userId", userById);

module.exports = router;
