const Pre_Reservation = require("../models/prereservation");
const mongoose = require("mongoose");

exports.preReservationById = (req, res, next, id) => {
	Pre_Reservation.findById(id).exec((err, pre_reservation) => {
		if (err || !pre_reservation) {
			return res.status(400).json({
				error: "pre_reservation was not found",
			});
		}
		req.pre_reservation = pre_reservation;
		next();
	});
};

exports.create = (req, res) => {
	const pre_reservation = new Pre_Reservation(req.body);
	pre_reservation.save((err, data) => {
		if (err) {
			console.log(err, "err");
			return res.status(400).json({
				error: "Cannot Create pre_reservation",
			});
		}
		res.json({ data });
	});
};

exports.read = (req, res) => {
	return res.json(req.pre_reservation);
};

exports.update = (req, res) => {
	console.log(req.body);
	const pre_reservation = req.pre_reservation;
	pre_reservation.customer_details = req.body.customer_details;
	pre_reservation.start_date = req.body.start_date;
	pre_reservation.end_date = req.body.end_date;
	pre_reservation.days_of_residence = req.body.days_of_residence;
	pre_reservation.payment_status = req.body.payment_status;
	pre_reservation.total_amount = req.body.total_amount;
	pre_reservation.booking_source = req.body.booking_source;
	pre_reservation.belongsTo = req.body.belongsTo;
	pre_reservation.hotelId = req.body.hotelId;

	pre_reservation.save((err, data) => {
		if (err) {
			return res.status(400).json({
				error: err,
			});
		}
		res.json(data);
	});
};

exports.list = (req, res) => {
	const userId = mongoose.Types.ObjectId(req.params.accountId);
	const today = new Date();
	const thirtyDaysAgo = new Date(today);
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	Pre_Reservation.find({
		belongsTo: userId,
		start_date: {
			$gte: thirtyDaysAgo, // Greater than or equal to 30 days ago
		},
	})
		.populate("belongsTo")
		.exec((err, data) => {
			if (err) {
				console.log(err, "err");
				return res.status(400).json({
					error: err,
				});
			}
			res.json(data);
		});
};

exports.list2 = (req, res) => {
	const userId = mongoose.Types.ObjectId(req.params.accountId);
	const today = new Date();
	const thirtyDaysAgo = new Date(today);
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	Pre_Reservation.find({
		belongsTo: userId,
		start_date: {
			$gte: thirtyDaysAgo, // Greater than or equal to 30 days ago
		},
	})
		.populate("belongsTo")
		.populate(
			"roomId",
			"room_number room_type room_features room_pricing floor roomColorCode"
		) // Populate room details
		.sort({ createdAt: -1 })
		.exec((err, data) => {
			if (err) {
				console.log(err, "err");
				return res.status(400).json({
					error: err,
				});
			}
			res.json(data);
		});
};

exports.remove = (req, res) => {
	const pre_reservation = req.pre_reservation;

	pre_reservation.remove((err, data) => {
		if (err) {
			return res.status(400).json({
				err: "error while removing",
			});
		}
		res.json({ message: "pre_reservation deleted" });
	});
};

exports.listForAdmin = (req, res) => {
	Pre_Reservation.find()
		.populate("belongsTo")
		.exec((err, data) => {
			if (err) {
				return res.status(400).json({
					error: err,
				});
			}
			res.json(data);
		});
};

exports.reservationSearch = async (req, res) => {
	try {
		const { searchQuery } = req.params;

		// Create a regex pattern to match the search query in a case-insensitive manner
		const searchPattern = new RegExp(searchQuery, "i");

		// Query to search across various fields
		const query = {
			$or: [
				{ "customer_details.name": searchPattern },
				{ "customer_details.phone": searchPattern },
				{ "customer_details.email": searchPattern },
				{ "customer_details.passport": searchPattern },
				{ "customer_details.passportExpiry": searchPattern },
				{ "customer_details.nationality": searchPattern },
				{ confirmation_number: searchPattern },
				{ provider_number: searchPattern },
			],
		};

		// Fetch the first matching document
		const reservation = await Pre_Reservation.findOne(query);

		if (!reservation) {
			return res.status(404).json({
				message: "No reservation found matching the search criteria.",
			});
		}

		res.json(reservation);
	} catch (error) {
		res.status(500).send("Server error");
	}
};

exports.updatePreReservationStatus = async (req, res) => {
	try {
		const { neededId } = req.params;

		// Update the overallBookingStatus to 'Closed'
		const updatedReservation = await Pre_Reservation.findByIdAndUpdate(
			neededId,
			{ overallBookingStatus: "Closed" },
			{ new: true } // Return the updated document
		);

		if (!updatedReservation) {
			return res.status(404).json({ message: "Reservation not found." });
		}

		res.json(updatedReservation);
	} catch (error) {
		res.status(500).send("Server error: " + error.message);
	}
};

exports.getListPreReservation = async (req, res) => {
	try {
		const today = new Date();
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(today.getDate() - 30);
		const ninetyDaysLater = new Date();
		ninetyDaysLater.setDate(today.getDate() + 90);

		const preReservations = await Pre_Reservation.find({
			createdAt: {
				$gte: thirtyDaysAgo,
				$lte: ninetyDaysLater,
			},
		});

		res.json(preReservations);
	} catch (error) {
		console.error(error);
		res.status(500).send("Server error: " + error.message);
	}
};
