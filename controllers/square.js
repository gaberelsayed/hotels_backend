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
			currency = "USD",
			reservation,
			amountInSar,
		} = req.body;

		console.log(amountInSar, "amountInSar");
		console.log(reservationId, "reservationId");
		// Ensure amount is treated as a number and convert to smallest currency unit (e.g., cents for USD)
		const amountInMinorUnits = Math.round(Number(amount) * 100);

		// Generate a unique idempotency key for the order
		const orderKey = crypto.randomUUID();

		// Create an order with custom fields
		const { result: orderResult } = await client.ordersApi.createOrder({
			order: {
				locationId: "LSCEA11F58GQF", //Production
				// locationId: "LSWZYQNK2HY28",
				customFields: [
					{ label: "Reservation ID", value: reservationId },
					{ label: "Hotel Name", value: reservation?.hotelId.hotelName },
					{
						label: "Confirmation Number",
						value: reservation?.confirmation_number,
					},
					// Add more custom fields as needed
				],
				lineItems: [
					{
						name: reservation.customer_details.name,
						quantity: "1",
						basePriceMoney: {
							amount: amountInMinorUnits,
							currency: "USD",
						},
					},
				],
			},
			idempotencyKey: orderKey,
		});

		if (orderResult.order && orderResult.order.id) {
			// Generate a unique idempotency key for the payment
			const paymentKey = crypto.randomUUID();

			// Create a payment linked to the order
			const { result: paymentResult } = await client.paymentsApi.createPayment({
				sourceId,
				idempotencyKey: paymentKey,
				amountMoney: { amount: amountInMinorUnits, currency },
				orderId: orderResult.order.id, // Link the payment to the order
				note: "Optional additional note about the payment",
			});

			// Check if the payment was successful
			if (
				paymentResult.payment &&
				paymentResult.payment.status === "COMPLETED"
			) {
				// Prepare payment details for storing
				const transactionDetails = {
					transactionId: paymentResult?.payment.id,
					amount: amount,
					currency: paymentResult.payment?.amountMoney.currency,
					status: paymentResult.payment?.status,
					sourceType: paymentResult.payment?.sourceType,
					receiptUrl: paymentResult.payment?.receiptUrl,
					orderId: paymentResult.payment?.orderId,
					// Include any other fields you find relevant from the response
				};

				// Update the reservation with payment details
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
					updatedReservation: {
						id: updatedReservation._id,
						paymentDetails: transactionDetails,
					},
				});
			} else {
				// Update the reservation with payment details
				const updatedReservation = await Reservations.findByIdAndUpdate(
					reservationId,
					{
						$set: {
							payment_details: transactionDetails,
							payment: "collected_square failed",
						},
					},
					{ new: true }
				);

				// Handle unsuccessful payment attempts
				res.status(400).json({
					success: false,
					updatedReservation: updatedReservation,
					error: "Payment was not successful.",
					message: paymentResult.payment
						? paymentResult.payment.status
						: "Payment failed or was not completed.",
				});
			}
		} else {
			// Handle order creation failure
			res.status(400).json({
				success: false,
				error: "Order creation failed.",
				message: "Failed to create an order for the payment.",
			});
		}
	} catch (error) {
		console.error("Square error:", error);
		res.status(500).json({
			success: false,
			error: "An error occurred processing your payment with Square.",
			message: error.message,
		});
	}
};
