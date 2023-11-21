const HotelDetails = require("../models/hotel_details");
const mongoose = require("mongoose");

exports.hotelDetailsById = (req, res, next, id) => {
	HotelDetails.findById(id).exec((err, hotelDetails) => {
		if (err || !hotelDetails) {
			return res.status(400).json({
				error: "hotelDetails was not found",
			});
		}
		req.hotelDetails = hotelDetails;
		next();
	});
};

exports.create = (req, res) => {
	const hotelDetails = new HotelDetails(req.body);
	hotelDetails.save((err, data) => {
		if (err) {
			console.log(err, "err");
			return res.status(400).json({
				error: "Cannot Create hotelDetails",
			});
		}
		res.json({ data });
	});
};

exports.read = (req, res) => {
	return res.json(req.hotelDetails);
};

exports.update = (req, res) => {
	console.log(req.body);
	const hotelDetails = req.hotelDetails;
	hotelDetails.hotelName = req.body.hotelName;
	hotelDetails.hotelAmenities = req.body.hotelAmenities;
	hotelDetails.hotelFloors = req.body.hotelFloors;
	hotelDetails.overallRoomsCount = req.body.overallRoomsCount;
	hotelDetails.roomCountDetails = req.body.roomCountDetails;
	hotelDetails.roomCountDetails = req.body.roomCountDetails;
	hotelDetails.parkingLot = req.body.parkingLot;

	hotelDetails.save((err, data) => {
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

	HotelDetails.find({ belongsTo: userId })
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

exports.remove = (req, res) => {
	const hotelDetails = req.hotelDetails;

	hotelDetails.remove((err, data) => {
		if (err) {
			return res.status(400).json({
				err: "error while removing",
			});
		}
		res.json({ message: "hotelDetails deleted" });
	});
};

exports.listForAdmin = (req, res) => {
	HotelDetails.find()
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
