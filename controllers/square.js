const crypto = require("crypto");
const { Client, Environment } = require("square");
require("dotenv").config();

// Initialize the Square client
const client = new Client({
	environment: Environment.Production, // Use Environment.Production for production environments
	accessToken: process.env.ACCESS_TOKEN,
});

const Reservations = require("../models/reservations");

exports.processSquarePayment = async (req, res) => {
	try {
		const {
			sourceId,
			reservationId,
			amount,
			currency,
			reservation,
			amountInSar,
		} = req.body;

		const amountInMinorUnits = Math.round(Number(amount) * 100);
		const orderKey = crypto.randomUUID();

		const { result: orderResult } = await client.ordersApi.createOrder({
			order: {
				locationId: "LSCEA11F58GQF", //Production
				// locationId: "LSWZYQNK2HY28", //Test
				customFields: [
					{ label: "Reservation ID", value: reservationId },
					{ label: "Hotel Name", value: reservation.hotelId.hotelName },
					{
						label: "Confirmation Number",
						value: reservation.confirmation_number,
					},
				],
				lineItems: [
					{
						name: reservation.customer_details.name,
						quantity: "1",
						basePriceMoney: {
							amount: amountInMinorUnits,
							currency: currency,
						},
					},
				],
			},
			idempotencyKey: orderKey,
		});

		if (orderResult.order && orderResult.order.id) {
			const paymentKey = crypto.randomUUID();

			const { result: paymentResult } = await client.paymentsApi.createPayment({
				sourceId,
				idempotencyKey: paymentKey,
				amountMoney: { amount: amountInMinorUnits, currency },
				orderId: orderResult.order.id,
			});

			if (
				paymentResult.payment &&
				paymentResult.payment.status === "COMPLETED"
			) {
				const transactionDetails = {
					transactionId: paymentResult.payment.id,
					amount: amount,
					currency: paymentResult.payment.amountMoney.currency,
					status: paymentResult.payment.status,
					sourceType: paymentResult.payment.sourceType,
					receiptUrl: paymentResult.payment.receiptUrl,
					orderId: paymentResult.payment.orderId,
				};

				const updatedReservation = await Reservations.findByIdAndUpdate(
					reservationId,
					{
						$set: {
							payment_details: transactionDetails,
							paid_amount: amountInSar,
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
			} else {
				res.status(400).json({
					success: false,
					error: "Payment was not successful.",
					message: paymentResult.payment
						? paymentResult.payment.status
						: "Payment failed or was not completed.",
				});
			}
		} else {
			res.status(400).json({
				success: false,
				error: "Order creation failed.",
				message: "Failed to create an order for the payment.",
			});
		}
	} catch (error) {
		res.status(500).json({
			success: false,
			error: "An error occurred processing your payment with Square.",
			message: error.message,
		});
	}
};
