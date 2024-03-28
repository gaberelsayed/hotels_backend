const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Reservations = require("../models/reservations");
const HotelDetails = require("../models/hotel_details");

exports.processPayment = async (req, res) => {
	try {
		let {
			paymentMethodId,
			hotelName,
			amount,
			amountInSAR,
			reservationId,
			chosenCurrency,
		} = req.body;

		// Convert amount to cents
		let amountInCents = Math.round(parseFloat(amount) * 100);

		// Create a Payment Intent
		const paymentIntent = await stripe.paymentIntents.create({
			amount: amountInCents,
			currency: chosenCurrency,
			payment_method: paymentMethodId,
			confirm: true, // Automatically confirm the payment
			automatic_payment_methods: { enabled: true, allow_redirects: "never" },
		});

		// Update the reservation with payment details
		const transactionDetails = {
			transactionId: paymentIntent.id,
			amount: paymentIntent.amount / 100, // Convert back to dollars
			currency: paymentIntent.currency,
			status: paymentIntent.status,
			paymentMethodId: paymentIntent.payment_method,
			createdAt: paymentIntent.created,
		};

		const updatedReservation = await Reservations.findByIdAndUpdate(
			reservationId,
			{
				$set: {
					payment_details: transactionDetails,
					paid_amount: amountInSAR,
					payment: "collected",
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
	} catch (error) {
		console.log(error.message, "Message Error");
		console.error("Stripe error:", error);
		res.status(500).json({
			success: false,
			error: "An error occurred processing your payment.",
			message: error.message,
		});
	}
};

exports.processPaymentWithCommission = async (req, res) => {
	try {
		let { paymentMethodId, hotelName, amount, reservationIds, chosenCurrency } =
			req.body;

		// Convert amount to cents
		let amountInCents = Math.round(parseFloat(amount) * 100);

		// Create a Payment Intent
		const paymentIntent = await stripe.paymentIntents.create({
			amount: amountInCents,
			currency: chosenCurrency,
			payment_method: paymentMethodId,
			confirm: true, // Automatically confirm the payment
			automatic_payment_methods: { enabled: true, allow_redirects: "never" },
		});

		// Update multiple reservations based on reservationIds
		const updatedReservations = await Reservations.updateMany(
			{ _id: { $in: reservationIds } },
			{
				$set: {
					payment_details: {
						transactionId: paymentIntent.id,
						amount: paymentIntent.amount / 100, // Convert back to dollars
						currency: paymentIntent.currency,
						status: paymentIntent.status,
						paymentMethodId: paymentIntent.payment_method,
						createdAt: paymentIntent.created,
					},
					paid_amount: amount,
					payment: "Paid",
					financeStatus: "paid", // Set financeStatus to "paid"
				},
			},
			{ new: true }
		);

		res.json({
			success: true,
			message: "Payment processed and reservations updated successfully.",
			updatedReservationsCount: updatedReservations.nModified, // Number of modified reservations
		});
	} catch (error) {
		console.error("Stripe error:", error);
		res.status(500).json({
			success: false,
			error: "An error occurred processing your payment.",
			message: error.message,
		});
	}
};

exports.processSubscription = async (req, res) => {
	try {
		let { paymentMethodId, email, customerId, priceId, hotelId } = req.body;

		// Create a Stripe Customer if not already exists
		let customer;
		if (!customerId) {
			customer = await stripe.customers.create({
				email: email,
				payment_method: paymentMethodId,
				invoice_settings: {
					default_payment_method: paymentMethodId,
				},
			});
			customerId = customer.id;
		} else {
			// Attach the payment method to the existing customer
			await stripe.paymentMethods.attach(paymentMethodId, {
				customer: customerId,
			});
			customer = await stripe.customers.update(customerId, {
				invoice_settings: {
					default_payment_method: paymentMethodId,
				},
			});
		}

		// Create the subscription
		const subscription = await stripe.subscriptions.create({
			customer: customerId,
			items: [{ price: priceId }],
			expand: ["latest_invoice.payment_intent"],
		});

		// Update HotelDetails document
		const updatedHotel = await HotelDetails.findByIdAndUpdate(
			hotelId,
			{
				subscribed: true,
				subscriptionId: subscription.id,
			},
			{ new: true }
		);

		res.status(201).json({
			result: "success",
			subscription: subscription,
			updatedHotel: updatedHotel,
		});
	} catch (error) {
		console.error("Stripe error:", error);
		res.status(500).json({
			result: "error",
			message: error.message,
		});
	}
};
