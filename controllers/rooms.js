const Rooms = require("../models/rooms");
const mongoose = require("mongoose");
const New_Reservation = mongoose.model("New_Reservation");
const Pre_Reservation = mongoose.model("Pre_Reservation");

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

exports.listOfRoomsSummary = async (req, res) => {
	try {
		const { checkin, checkout } = req.params;
		const startDate = new Date(checkin);
		const endDate = new Date(checkout);

		// Aggregate total rooms by type, including room pricing
		const totalRoomsByType = await Rooms.aggregate([
			{
				$group: {
					_id: "$room_type",
					totalRooms: { $sum: 1 },
					roomPricing: { $first: "$room_pricing" },
				},
			},
		]);

		// Find overlapping new reservations
		const overlappingNewReservations = await New_Reservation.aggregate([
			{
				$match: {
					$or: [
						{ start_date: { $lte: endDate, $gte: startDate } },
						{ end_date: { $lte: endDate, $gte: startDate } },
						{ start_date: { $lte: startDate }, end_date: { $gte: endDate } },
					],
				},
			},
			{ $unwind: "$roomId" },
			{
				$lookup: {
					from: "rooms",
					localField: "roomId",
					foreignField: "_id",
					as: "roomDetails",
				},
			},
			{ $unwind: "$roomDetails" },
			{
				$group: {
					_id: "$roomDetails.room_type",
					bookedCount: { $sum: 1 },
				},
			},
		]);

		// Find overlapping pre-reservations
		// Aggregate pickedRoomsType to get the total count for each room_type
		const overlappingPreReservations = await Pre_Reservation.aggregate([
			{
				$match: {
					overallBookingStatus: "Open", // Add this condition
					start_date: { $lte: endDate },
					end_date: { $gte: startDate },
				},
			},
			{ $unwind: "$pickedRoomsType" },
			{
				$group: {
					_id: "$pickedRoomsType.room_type",
					reservedCount: { $sum: "$pickedRoomsType.count" },
				},
			},
		]);

		// Calculate booked, available, reserved rooms, and include room pricing
		let summary = totalRoomsByType.map((roomType) => {
			let bookedRoomEntry = overlappingNewReservations.find(
				(bnr) => bnr._id === roomType._id
			);
			let bookedCount = bookedRoomEntry ? bookedRoomEntry.bookedCount : 0;

			// Find the reserved count for this room type
			let reservedRoomEntry = overlappingPreReservations.find(
				(pr) => pr._id === roomType._id
			);
			let reservedCount = reservedRoomEntry
				? reservedRoomEntry.reservedCount
				: 0;

			return {
				room_type: roomType._id,
				room_price: roomType.roomPricing,
				available: roomType.totalRooms - bookedCount - reservedCount,
				occupiedRooms: bookedCount,
				reservedRooms: reservedCount,
				totalRooms: roomType.totalRooms,
			};
		});

		res.json(summary);
	} catch (error) {
		res.status(500).send("Server error");
	}
};
