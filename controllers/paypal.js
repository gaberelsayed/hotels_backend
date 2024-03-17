const paypal = require("@paypal/checkout-server-sdk");
const Reservations = require("../models/reservations");
require("dotenv").config();

// Helper function to create an environment
function environment() {
	let clientId = process.env.PAYPAL_CLIENT_ID_SANDBOX;
	let clientSecret = process.env.PAYPAL_CLIENT_SECRET_SANDBOX;

	return new paypal.core.SandboxEnvironment(clientId, clientSecret);
}

// Helper function to create a new PayPal client
function client() {
	return new paypal.core.PayPalHttpClient(environment());
}

// Function to handle payment processing
exports.processPayment_SAR = async (req, res) => {
	let amountFromTheClientInSAR = parseFloat(req.body.amount).toFixed(2);
	let reservationId = req.params.reservationId;

	// Construct a request object and set desired parameters
	let request = new paypal.orders.OrdersCreateRequest();
	request.prefer("return=representation");
	request.requestBody({
		intent: "CAPTURE",
		purchase_units: [
			{
				amount: {
					currency_code: "SAR",
					value: amountFromTheClientInSAR,
				},
			},
		],
	});

	try {
		// Call PayPal to set up a payment
		const createResponse = await client().execute(request);

		// If the response was successful, proceed to update the reservation
		if (createResponse.statusCode === 201) {
			const approvalUrl = createResponse.result.links.find(
				(link) => link.rel === "approve"
			).href;

			await Reservations.findByIdAndUpdate(reservationId, {
				$set: {
					payment_details: {
						orderId: createResponse.result.id,
						amount: amountFromTheClientInSAR,
						currency: "SAR",
					},
					payment_status: "Pending",
				},
			});

			res.json({
				success: true,
				message: "Order created successfully. Redirecting to PayPal.",
				approvalUrl: approvalUrl,
			});
		} else {
			res.status(500).json({
				success: false,
				message: "Unable to create order. Try again later.",
			});
		}
	} catch (err) {
		console.error(err);
		res.status(500).json({
			success: false,
			message: "An error occurred while processing payment.",
			error: err.message,
		});
	}
};
