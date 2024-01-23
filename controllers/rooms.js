const Rooms = require("../models/rooms");
const mongoose = require("mongoose");
const New_Reservation = mongoose.model("New_Reservation");
const Pre_Reservation = mongoose.model("Pre_Reservation");
const fetch = require("node-fetch");
const Reservations = require("../models/reservations");

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

	Rooms.find({ hotelId: userId })
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
		const overlappingNewReservations = await Reservations.aggregate([
			{
				$match: {
					$or: [
						{ checkin_date: { $lte: endDate, $gte: startDate } },
						{ checkout_date: { $lte: endDate, $gte: startDate } },
						{ checkin_date: { $lte: startDate }, end_date: { $gte: endDate } },
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
		const overlappingPreReservations = await Reservations.aggregate([
			{
				$match: {
					overallBookingStatus: "Confirmed", // Add this condition
					checkin_date: { $lte: endDate },
					checkout_date: { $gte: startDate },
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

exports.hotelRunnerRoomList = async (req, res) => {
	const token = process.env.HOTEL_RUNNER_TOKEN;
	const hrId = process.env.HR_ID;

	const url = `https://app.hotelrunner.com/api/v2/apps/rooms?token=${token}&hr_id=${hrId}`;

	try {
		const response = await fetch(url);
		const data = await response.json();

		if (response.ok) {
			res.json(data.rooms);
		} else {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
	} catch (error) {
		console.error("Error fetching room list:", error);
		res.status(500).json({ error: "Error fetching room list" });
	}
};

exports.getDistinctRoomTypes = async (req, res) => {
	try {
		const distinctRoomTypes = await Rooms.distinct("room_type");
		res.json(distinctRoomTypes);
	} catch (error) {
		console.error("Error fetching distinct room types:", error);
		res.status(500).json({ error: "Error fetching distinct room types" });
	}
};

exports.getDistinctRoomTypesFromReservations = async (req, res) => {
	try {
		const distinctRoomTypes = await Reservations.aggregate([
			{ $unwind: "$pickedRoomsType" },
			{ $group: { _id: "$pickedRoomsType.room_type" } },
			{ $project: { roomType: "$_id", _id: 0 } },
		]);

		const roomTypes = distinctRoomTypes
			.map((item) => item.roomType)
			.filter((type) => type !== "");

		res.json(roomTypes);
	} catch (error) {
		console.error(
			"Error fetching distinct room types from reservations:",
			error
		);
		res
			.status(500)
			.json({ error: "Error fetching distinct room types from reservations" });
	}
};

exports.getDistinctHotelRunnerRooms = async (req, res) => {
	const token = process.env.HOTEL_RUNNER_TOKEN;
	const hrId = process.env.HR_ID;

	const url = `https://app.hotelrunner.com/api/v2/apps/rooms?token=${token}&hr_id=${hrId}`;

	try {
		const response = await fetch(url);
		const data = await response.json();

		if (response.ok && data.rooms) {
			const roomTypesAndCodes = data.rooms.map((room) => ({
				roomType: room.name,
				roomCode: room.rate_code,
			}));

			// Remove duplicates if any
			const uniqueRoomTypesAndCodes = Array.from(
				new Set(roomTypesAndCodes.map(JSON.stringify))
			).map(JSON.parse);

			res.json(uniqueRoomTypesAndCodes);
		} else {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
	} catch (error) {
		console.error("Error fetching room types and codes:", error);
		res.status(500).json({ error: "Error fetching room types and codes" });
	}
};

// Translation map (for demonstration; replace with a real translation API for production)
const translations = {
	"غرفه ثلاثى": "Triple Room",
	"غرفه رباعية": "Quadruple Room",
	"غرفه عائلية": "Family Room",
	"سويت بغرفتين": "Suite",
	"غرفة لذوى الأحتياجات الخاصة": "Accessible Room",
	// Add more translations as needed
};

// Function to translate room names from Arabic to English
const translateRoomName = (name) => translations[name] || name;

// Function to map room types to Hotel Runner room codes
const mapRoomTypeToCode = async (frontendRoomType) => {
	const token = process.env.HOTEL_RUNNER_TOKEN;
	const hrId = process.env.HR_ID;
	const url = `https://app.hotelrunner.com/api/v2/apps/rooms?token=${token}&hr_id=${hrId}`;

	try {
		const response = await fetch(url);
		const data = await response.json();

		if (response.ok && data.rooms) {
			const roomTypesAndCodes = data.rooms.map((room) => ({
				roomType: translateRoomName(room.name).toLowerCase(),
				roomCode: room.rate_code,
			}));

			// Find the best matching room code based on roomType keywords
			const matchingRoom = roomTypesAndCodes.find(({ roomType }) =>
				roomType.includes(frontendRoomType.toLowerCase())
			);

			return matchingRoom ? matchingRoom.roomCode : null;
		}
	} catch (error) {
		console.error("Error fetching room types and codes:", error);
	}

	return null; // Return null if no match is found
};

// Updated function to update room inventory
exports.updateRoomInventory = async (req, res) => {
	const token = process.env.HOTEL_RUNNER_TOKEN;
	const hrId = process.env.HR_ID;

	const {
		roomType, // Room type from the frontend
		startDate,
		endDate,
		availability,
		price,
		minStay,
		stopSale,
	} = req.body;

	// Map room type to room code
	const roomCode = await mapRoomTypeToCode(roomType);

	if (!roomCode) {
		return res.status(400).json({ error: "Invalid room type" });
	}

	const url = `https://app.hotelrunner.com/api/v2/apps/rooms/~`;

	const params = new URLSearchParams({
		hr_id: hrId,
		token: token,
		room_code: roomCode,
		start_date: startDate,
		end_date: endDate,
		availability: availability,
		price: price,
		min_stay: minStay,
		stop_sale: stopSale,
	});

	try {
		const response = await fetch(url, {
			method: "PUT",
			body: params,
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
		});

		const data = await response.json();

		if (data.status === "ok") {
			res.json({
				message: "Room inventory updated successfully",
				transaction_id: data.transaction_id,
			});
		} else {
			res.json({
				message: "Failed to update room inventory",
				transaction_id: data.transaction_id,
			});
		}
	} catch (error) {
		console.error("Error updating room inventory:", error);
		res.status(500).json({ error: "Error updating room inventory" });
	}
};

//Main Function
// exports.updateRoomInventory = async (req, res) => {
// 	const token = process.env.HOTEL_RUNNER_TOKEN;
// 	const hrId = process.env.HR_ID;

// 	// Extract room update parameters from the request body or query
// 	const {
// 		roomCode,
// 		startDate,
// 		endDate,
// 		availability,
// 		price,
// 		minStay,
// 		stopSale,
// 	} = req.body;

// 	const url = `https://app.hotelrunner.com/api/v2/apps/rooms/~`;

// 	const params = new URLSearchParams({
// 		hr_id: hrId,
// 		token: token,
// 		room_code: roomCode,
// 		start_date: startDate,
// 		end_date: endDate,
// 		availability: availability,
// 		price: price,
// 		min_stay: minStay,
// 		stop_sale: stopSale,
// 	});

// 	try {
// 		const response = await fetch(url, {
// 			method: "PUT",
// 			body: params,
// 			headers: {
// 				"Content-Type": "application/x-www-form-urlencoded",
// 			},
// 		});

// 		const data = await response.json();

// 		if (data.status === "ok") {
// 			res.json({
// 				message: "Room inventory updated successfully",
// 				transaction_id: data.transaction_id,
// 			});
// 		} else {
// 			res.json({
// 				message: "Failed to update room inventory",
// 				transaction_id: data.transaction_id,
// 			});
// 		}
// 	} catch (error) {
// 		console.error("Error updating room inventory:", error);
// 		res.status(500).json({ error: "Error updating room inventory" });
// 	}
// };
