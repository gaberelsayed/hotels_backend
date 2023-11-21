const Rooms = require("../models/rooms");
const mongoose = require("mongoose");

exports.roomById = (req, res, next, id) => {
	Rooms.findById(id).exec((err, room) => {
		if (err || !room) {
			return res.status(400).json({
				error: "room was not found",
			});
		}
		req.room = room;
		next();
	});
};

exports.create = (req, res) => {
	const room = new Rooms(req.body);
	room.save((err, data) => {
		if (err) {
			console.log(err, "err");
			return res.status(400).json({
				error: "Cannot Create room",
			});
		}
		res.json({ data });
	});
};

exports.read = (req, res) => {
	return res.json(req.room);
};

exports.update = (req, res) => {
	console.log(req.body);
	const room = req.room;
	room.room_number = req.body.room_number;
	room.room_type = req.body.room_type;
	room.room_features = req.body.room_features;
	room.room_pricing = req.body.room_pricing;
	room.floor = req.body.floor;
	room.roomColorCode = req.body.roomColorCode;
	room.belongsTo = req.body.belongsTo;
	room.hotelId = req.body.hotelId;

	room.save((err, data) => {
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

	Rooms.find({ belongsTo: userId })
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
	const room = req.room;

	room.remove((err, data) => {
		if (err) {
			return res.status(400).json({
				err: "error while removing",
			});
		}
		res.json({ message: "room deleted" });
	});
};

exports.listForAdmin = (req, res) => {
	Rooms.find()
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
