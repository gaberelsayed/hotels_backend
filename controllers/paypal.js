const paypal = require("@paypal/checkout-server-sdk");
require("dotenv").config();

// Set up the environment with your PayPal credentials
function environment() {
	let clientId = process.env.PAYPAL_CLIENTID;
	let clientSecret = process.env.PAYPAL_SECRET;
	return new paypal.core.LiveEnvironment(clientId, clientSecret);
}

// Create a new PayPal client
function client() {
	return new paypal.core.PayPalHttpClient(environment());
}

// Handle order creation
exports.createOrder = async (req, res) => {
	const { totalAmount, currency, reservationId } = req.body; // Include reservationId in the body
	console.log(req.body);
	let request = new paypal.orders.OrdersCreateRequest();
	const formattedTotalAmount = Number(totalAmount).toFixed(2);

	request.requestBody({
		intent: "CAPTURE",
		purchase_units: [
			{
				reference_id: reservationId, // Use reservationId as the reference_id
				amount: {
					currency_code: currency,
					value: formattedTotalAmount, // Convert to string as PayPal API expects a string
				},
				// payee: {
				//     // Include payee email if needed here
				// }
			},
		],
		// ... include other necessary order details
	});

	try {
		const order = await client().execute(request);
		res.json({
			orderID: order.result.id,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			error: err.message,
		});
	}
};

// Handle order capture
exports.captureOrder = async (req, res) => {
	const { orderID, vendorEmail } = req.body; // Make sure to pass vendorEmail from the frontend
	let request = new paypal.orders.OrdersCaptureRequest(orderID);

	try {
		const capture = await client().execute(request);
		const totalAmount = capture.result.purchase_units[0].amount.value;
		const commissionPercentage = 0.03; // 3% commission
		const commissionAmount = (totalAmount * commissionPercentage).toFixed(2);
		const vendorAmount = (totalAmount - commissionAmount).toFixed(2);

		// You may want to save this transaction in your database before initiating the payout

		// After saving, initiate the payout to the vendor
		let payoutRequest = new paypal.payouts.PayoutsPostRequest();
		payoutRequest.requestBody({
			sender_batch_header: {
				sender_batch_id: "Payouts_" + Math.random().toString(36).substring(7),
				email_subject: "You have received a payment!",
			},
			items: [
				{
					recipient_type: "EMAIL",
					receiver: vendorEmail,
					amount: {
						currency: "USD",
						value: vendorAmount,
					},
					note: "Payment for services rendered",
					sender_item_id:
						"Payouts_Item_" + Math.random().toString(36).substring(7),
				},
			],
		});

		// Execute the payout
		const payout = await client().execute(payoutRequest);

		// Respond with both capture and payout details
		res.json({
			captureID: capture.result.purchase_units[0].payments.captures[0].id,
			payoutBatchId: payout.result.batch_header.payout_batch_id,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			error: err.message,
		});
	}
};
