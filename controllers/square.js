const crypto = require("crypto");
const { Client, Environment } = require("square");

require("dotenv").config();
const client = new Client({
	environment: Environment.Production,
	accessToken: process.env.ACCESS_TOKEN,
});

const Reservations = require("../models/reservations");

exports.processSquarePayment = async (req, res) => {
	try {
		const { sourceId, reservationId, amount, currency } = req.body;
		const amountInMinorUnits = Math.round(Number(amount) * 100);
		const idempotencyKey = crypto.randomUUID();

		const { result: paymentResult } = await client.paymentsApi.createPayment({
			sourceId,
			idempotencyKey,
			amountMoney: { amount: amountInMinorUnits, currency },
			// locationId: "LSCEA11F58GQF", //Production
			// locationId: "LSWZYQNK2HY28", //Test
		});

		if (
			!paymentResult.payment ||
			paymentResult.payment.status !== "COMPLETED"
		) {
			throw new Error(
				paymentResult.payment
					? paymentResult.payment.status
					: "Payment failed or was not completed."
			);
		}

		const transactionDetails = {
			transactionId: paymentResult.payment.id,
			amount,
			currency: paymentResult.payment.amountMoney.currency,
			status: paymentResult.payment.status,
			sourceType: paymentResult.payment.sourceType,
			receiptUrl: paymentResult.payment.receiptUrl,
		};

		const updatedReservation = await Reservations.findByIdAndUpdate(
			reservationId,
			{
				$set: {
					payment_details: transactionDetails,
					payment: "collected_square",
				},
			},
			{ new: true }
		);

		res.json({
			success: true,
			message: "Payment processed and reservation updated successfully.",
			updatedReservation,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: "An error occurred processing your payment with Square.",
			message: error.message,
		});
	}
};
