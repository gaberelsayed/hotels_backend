/** @format */

const braintree = require("braintree");
const Reservations = require("../models/reservations");
const fetch = require("node-fetch");

require("dotenv").config();

var gateway = new braintree.BraintreeGateway({
	environment: braintree.Environment.Production, // Production Sandbox
	merchantId: process.env.BRAINTREE_MERCHANT_ID,
	publicKey: process.env.BRAINTREE_PUBLIC_KEY,
	privateKey: process.env.BRAINTREE_PRIVATE_KEY,
});

exports.generateToken = (req, res) => {
	gateway.clientToken.generate({}, function (err, response) {
		if (err) {
			console.log(err, "err from braintree");
			res.status(500).send(err);
		} else {
			res.send(response);
		}
	});
};

exports.processPayment = (req, res) => {
	let nonceFromTheClient = req.body.paymentMethodNonce;
	let amountFromTheClient = parseFloat(req.body.amount).toFixed(2); // Ensure amount is in a valid format
	let reservationId = req.params.reservationId; // Get reservationId from request parameters

	let merchantAccountId = "infiniteapps_instant"; // Merchant account ID for transactions in USD

	gateway.transaction.sale(
		{
			amount: amountFromTheClient,
			merchantAccountId: merchantAccountId, // Specify the merchant account ID
			paymentMethodNonce: nonceFromTheClient,
			options: {
				submitForSettlement: true,
			},
		},
		(error, result) => {
			if (error) {
				console.error("Braintree error:", error);
				return res.status(500).json({
					success: false,
					error: "An error occurred processing your payment.",
				});
			}

			if (result.success) {
				const transactionDetails = {
					transactionId: result.transaction.id,
					amount: result.transaction.amount,
					currency: result.transaction.currencyIsoCode,
					status: result.transaction.status,
					paymentMethodToken: result.transaction.creditCard
						? result.transaction.creditCard.token
						: undefined,
					createdAt: result.transaction.createdAt,
				};

				Reservations.findByIdAndUpdate(
					reservationId,
					{
						$set: {
							payment_details: transactionDetails,
							paid_amount: amountFromTheClient,
							payment: "Paid (Affiliate)",
						},
					},
					{ new: true },
					(err, updatedReservation) => {
						if (err) {
							console.error("Database update error:", err);
							return res.status(500).json({
								success: false,
								error: "Failed to update reservation with payment details.",
							});
						}
						res.json({
							success: true, // Explicitly indicate success for clarity
							message:
								"Payment processed and reservation updated successfully.",
							updatedReservation: {
								id: updatedReservation._id,
								paymentDetails: transactionDetails,
							},
						});
					}
				);
			} else {
				console.error(
					"Braintree transaction failed:",
					JSON.stringify(result, null, 4)
				);
				const detailedErrors = extractBraintreeErrors(result.errors);
				console.error("Detailed validation errors:", detailedErrors);
				res.status(400).json({
					success: false, // Explicitly indicate failure
					error: "Payment was not successful.",
					details: detailedErrors,
				});
			}
		}
	);
};

function extractBraintreeErrors(errors) {
	const errorMessages = [];
	if (errors && errors.deepErrors) {
		for (const deepError of errors.deepErrors()) {
			errorMessages.push({
				code: deepError.code,
				message: deepError.message,
			});
		}
	}
	return errorMessages;
}

// exports.processSubscription = (req, res) => {
// 	console.log(req.body);
// 	let nonceFromTheClient = req.body.paymentMethodNonce;
// 	// let amountFromTheClient = req.body.amount;
// 	// charge
// 	let newTransaction = gateway.subscription.create(
// 		{
// 			paymentMethodToken: nonceFromTheClient,
// 			planId: "Barbershop-Monthly-Basic",
// 			merchantAccountId: process.env.BRAINTREE_MERCHANT_ID,
// 			price: "40",
// 		},
// 		(error, result) => {
// 			if (error) {
// 				res.status(500).json(error);
// 			} else {
// 				console.log(result);
// 				res.json(result);
// 			}
// 		},
// 	);
// };

exports.processSubscription = (req, res) => {
	console.log(
		req.body,
		"this is req.body for subscription from braintreeController"
	);

	let nonceFromTheClient = req.body.paymentMethodNonce;
	let amountFromTheClient = req.body.amount;

	// charge
	gateway.customer.create(
		{
			id: req.body.customerId,
			email: req.body.email,
		},
		(err) => {
			if (err) return res.status(500).send(error);
			gateway.paymentMethod.create(
				{
					customerId: req.body.customerId,
					paymentMethodNonce: nonceFromTheClient,
				},
				(err, result) => {
					if (err) return res.status(500).send(error);
					gateway.subscription.create(
						{
							paymentMethodToken: result.paymentMethod.token,
							planId: req.body.planId,
							price: amountFromTheClient,
							trialDuration: req.body.trialDuration,
							trialDurationUnit: req.body.trialDurationUnit,
						},
						(err, result) => {
							console.log(err, "from processing the subscription");
							if (err) return res.status(500).send(error);
							//////
							console.log(result, "result.subscription From Subscription");
							// console.log(result, "result Only From Subscription");

							//////

							res.status(201).json({
								result: "success",
								subscription: result.subscription,
							});
							/////
						}
					);
				}
			);
		}
	);
};

// const stream = gateway.subscription.search(
// 	(search) => {
// 		search.planId().is("quarterly_plan");
// 		search.inTrialPeriod().is(true);

// 	},
// 	(err, response) => {
// 		response.each((err, subscription) => {
// 			console.log(subscription);
// 		});
// 	},
// );

exports.gettingBraintreeDataById = (req, res) => {
	// console.log(req.body, "from getting data in braintree");
	gateway.subscription.find(req.params.planId, (err, result) => {
		if (err) return res.status(500).send(error);
		res.status(201).json({
			result: "success",
			result: result,
		});
	});
};

exports.processSubscriptionUpdate = (req, res) => {
	// console.log(
	// 	req.body,
	// 	req.params.subId,
	// 	"this is req.body for subscription update braintree",
	// );

	let nonceFromTheClient = req.body.paymentMethodNonce;
	let amountFromTheClient = req.body.amount;
	// charge
	gateway.paymentMethod.create(
		{
			customerId: req.body.customerId,
			paymentMethodNonce: nonceFromTheClient,
		},
		(err, result) => {
			if (err) return res.status(500).send(error);
			gateway.subscription.update(
				req.params.subId,
				{
					paymentMethodToken: result.paymentMethod.token,
					planId: req.body.planId,
					// planId: "quarterly_plan",
					price: amountFromTheClient,
					// price: "180.00",
				},
				(err, result) => {
					if (err) return res.status(500).send(error);
					console.log(result.subscription, "result.subscription");
					res.status(201).json({
						result: "success",
						subscription: result.subscription,
					});
					console.log("result Only", result, "result Only");
				}
			);
		}
	);
};

exports.gettingBraintreeDataById_Admin = (req, res) => {
	// console.log(req.body, "from getting data in braintree");

	gateway.subscription.find(req.params.planId, (err, result) => {
		if (err) return res.status(500).send(error);
		res.status(201).json({
			result: "success",
			result: result,
		});
	});
};

exports.gettingCurrencyConversion = (req, res) => {
	// Retrieve the amount in SAR from the request parameters
	const amountInSAR = req.params.saudimoney;

	// Construct the API URL using the provided documentation format
	const apiUrl = `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE}/pair/SAR/USD/${amountInSAR}`;

	// Make the API request
	fetch(apiUrl)
		.then((response) => response.json()) // Parsing the JSON response body
		.then((data) => {
			// Check if the API call was successful
			if (data.result === "success") {
				// Calculate the amount in USD
				const amountInUSD = data.conversion_result;

				// Construct the response object
				const responseObject = {
					USD: 1, // Assuming 1 USD to USD conversion rate
					SAR: data.conversion_rate, // The conversion rate from SAR to USD
					amountInSAR: amountInSAR, // The original amount in SAR
					amountInUSD: amountInUSD, // The converted amount in USD
				};

				// Send the response object
				res.json(responseObject);
			} else {
				// Handle the case where the API response is not successful
				res.status(500).json({ error: "Failed to convert currency" });
			}
		})
		.catch((error) => {
			// Handle any errors that occur during the API request
			res.status(500).json({ error: error.message });
		});
};
