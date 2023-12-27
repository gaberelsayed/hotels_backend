const New_Reservation = require("../models/newreservation");
const mongoose = require("mongoose");

exports.newReservationById = (req, res, next, id) => {
	New_Reservation.findById(id).exec((err, new_reservation) => {
		if (err || !new_reservation) {
			return res.status(400).json({
				error: "new_reservation was not found",
			});
		}
		req.new_reservation = new_reservation;
		next();
	});
};

exports.create = (req, res) => {
	const new_reservation = new New_Reservation(req.body);
	new_reservation.save((err, data) => {
		if (err) {
			console.log(err, "err");
			return res.status(400).json({
				error: "Cannot Create new_reservation",
			});
		}
		res.json({ data });
	});
};

exports.read = (req, res) => {
	return res.json(req.new_reservation);
};

exports.update = (req, res) => {
	console.log(req.body);
	const new_reservation = req.new_reservation;
	new_reservation.customer_details = req.body.customer_details;
	new_reservation.start_date = req.body.start_date;
	new_reservation.end_date = req.body.end_date;
	new_reservation.days_of_residence = req.body.days_of_residence;
	new_reservation.payment_status = req.body.payment_status;
	new_reservation.total_amount = req.body.total_amount;
	new_reservation.booking_source = req.body.booking_source;
	new_reservation.belongsTo = req.body.belongsTo;
	new_reservation.hotelId = req.body.hotelId;
	new_reservation.roomId = req.body.roomId;

	new_reservation.save((err, data) => {
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

	New_Reservation.find({
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

	New_Reservation.find({
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
	const new_reservation = req.new_reservation;

	new_reservation.remove((err, data) => {
		if (err) {
			return res.status(400).json({
				err: "error while removing",
			});
		}
		res.json({ message: "new_reservation deleted" });
	});
};

exports.listForAdmin = (req, res) => {
	New_Reservation.find()
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
