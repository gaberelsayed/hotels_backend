const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Reservations = require("../models/reservations");
const HotelDetails = require("../models/hotel_details");

exports.createPaymentIntent = async (req, res) => {
	try {
		const { amount, metadata } = req.body; // Assuming metadata is passed in the request body

		const paymentIntent = await stripe.paymentIntents.create({
			amount,
			currency: "USD",
			metadata,
			payment_method_types: ["card"],
		});

		res.json({ clientSecret: paymentIntent.client_secret });
	} catch (error) {
		console.error("Stripe error:", error);
		res.status(500).json({
			result: "error",
			message: error.message,
		});
	}
};

exports.processPayment = async (req, res) => {
	try {
		const { paymentMethodId, paymentIntentId, reservationId, amountInSAR } =
			req.body;

		// Confirm the existing payment intent with the provided payment method
		const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
			payment_method: paymentMethodId,
		});

		if (
			paymentIntent.status === "requires_action" ||
			paymentIntent.status === "requires_source_action"
		) {
			res.json({
				success: true,
				requiresAction: true,
				paymentIntentId: paymentIntent.id,
				message:
					"3D Secure authentication is required. Please complete the authentication.",
			});
		} else {
			const transactionDetails = {
				transactionId: paymentIntent.id,
				amount: paymentIntent.amount / 100,
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
		}
	} catch (error) {
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

exports.createCheckoutSession = async (req, res) => {
	try {
		const { amount, hotelName, chosenCurrency, confirmation_number, name } =
			req.body;

		console.log(req.body, "req.body");

		// Round the amount to two decimal places and convert to cents
		const amountInCents = Math.round(Number(amount).toFixed(2) * 100);

		// Create a Checkout Session
		const session = await stripe.checkout.sessions.create({
			payment_method_types: ["card"],
			line_items: [
				{
					price_data: {
						currency: chosenCurrency,
						product_data: {
							name: "Reservation Payment",
						},
						unit_amount: amountInCents,
					},
					quantity: 1,
				},
			],
			mode: "payment",
			success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${process.env.CLIENT_URL}/cancel`,
			metadata: {
				confirmation_number: req.body.confirmation_number,
				name: req.body.name ? req.body.name : "",
				phone: req.body.phone ? req.body.phone : "",
				email: req.body.email ? req.body.email : "",
				hotel_name: hotelName ? hotelName : "",
				nationality: req.body.nationality ? req.body.nationality : "",
				checkin_date: req.body.checkin_date ? req.body.checkin_date : "",
				checkout_date: req.body.checkout_date ? req.body.checkout_date : "",
				reservation_status: req.body.reservation_status
					? req.body.reservation_status
					: "",
				// Any other data you'd like to store
			},
		});

		res.json({ url: session.url });
	} catch (error) {
		console.error("Stripe Checkout Session error:", error);
		res.status(500).json({
			success: false,
			error: "An error occurred creating the checkout session.",
			message: error.message,
		});
	}
};

exports.stripeWebhook = async (req, res) => {
	const sig = req.headers["stripe-signature"];
	let event;

	try {
		event = stripe.webhooks.constructEvent(
			req.body,
			sig,
			process.env.STRIPE_WEBHOOK_SECRET
		);
	} catch (err) {
		console.log(`Webhook Error: ${err.message}`);
		return res.status(400).send(`Webhook Error: ${err.message}`);
	}

	// Handle the checkout.session.completed event
	if (event.type === "checkout.session.completed") {
		const session = event.data.object;
		const reservationId = session.metadata.reservationId;

		// Update the reservation with payment details
		const transactionDetails = {
			transactionId: session.id,
			amount: session.amount_total / 100, // Convert back to dollars
			currency: session.currency,
			status: "succeeded",
		};

		try {
			const updatedReservation = await Reservations.findByIdAndUpdate(
				reservationId,
				{
					$set: {
						payment_details: transactionDetails,
						paid_amount: session.amount_total / 100, // Assuming amount_total is in the same currency as amountInSAR
						payment: "collected",
					},
				},
				{ new: true }
			);

			console.log("Reservation updated successfully:", updatedReservation);
		} catch (error) {
			console.error("Error updating reservation:", error);
		}
	}

	// Return a response to acknowledge receipt of the event
	res.json({ received: true });
};
