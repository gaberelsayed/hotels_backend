const paypal = require("@paypal/payouts-sdk");

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

// Function to handle PayPal merchant creation and payouts
exports.payPalMerchantCreation = async (req, res) => {
	let payoutEmail = req.body.payoutEmail; // The vendor's PayPal email
	let payoutAmount = req.body.payoutAmount; // The amount to payout

	let request = new paypal.payouts.PayoutsPostRequest();
	request.requestBody({
		sender_batch_header: {
			sender_batch_id: "Payouts_" + Math.random().toString(36).substring(7),
			email_subject: "You have received a payout!",
		},
		items: [
			{
				recipient_type: "EMAIL",
				receiver: payoutEmail,
				amount: {
					currency: "USD",
					value: payoutAmount,
				},
				note: "Thanks for using our platform!",
				sender_item_id:
					"Payouts_Item_" + Math.random().toString(36).substring(7),
			},
		],
	});

	try {
		const response = await client().execute(request);
		res.json({
			success: true,
			message: "Payout initiated successfully.",
			payoutBatchId: response.result.batch_header.payout_batch_id,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			success: false,
			message: "An error occurred while initiating the payout.",
			error: err.message,
		});
	}
};
