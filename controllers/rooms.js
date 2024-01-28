const Rooms = require("../models/rooms");
const mongoose = require("mongoose");
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

exports.list = async (req, res) => {
	const accountId = mongoose.Types.ObjectId(req.params.accountId);
	const mainUserId = mongoose.Types.ObjectId(req.params.mainUserId);
	console.log(accountId, "accountId");
	console.log(mainUserId, "mainUserId");

	try {
		const data = await Rooms.aggregate([
			{
				$match: {
					$or: [{ hotelId: accountId }, { belongsTo: mainUserId }],
				},
			},
			{
				$group: {
					_id: "$room_type", // Grouping by room_type to avoid duplicates
					rooms: { $push: "$$ROOT" }, // $$ROOT represents the whole document
				},
			},
			{
				$project: {
					rooms: 1,
					_id: 0, // Not including _id in the final output
				},
			},
		]).exec();

		// Flatten the results since they are grouped by room_type
		const flatData = data.reduce((acc, curr) => [...acc, ...curr.rooms], []);
		res.json(flatData);
	} catch (err) {
		console.log(err, "err");
		res.status(400).json({ error: err.message });
	}
};

exports.removeDuplicates = async (req, res) => {
	try {
		// Step 1: Identify duplicates
		const duplicates = await Rooms.aggregate([
			{
				$group: {
					_id: {
						combinedField: {
							$concat: [
								"$room_number",
								{ $toString: "$belongsTo" }, // Convert ObjectId to string
							],
						},
					},
					ids: { $push: "$_id" },
					count: { $sum: 1 },
				},
			},
			{
				$match: {
					count: { $gt: 1 },
				},
			},
		]).exec();

		let removedCount = 0;

		// Step 2: Remove duplicates
		for (const dup of duplicates) {
			const idsToRemove = dup.ids.slice(1); // Keep one document, remove the rest
			const result = await Rooms.deleteMany({
				_id: { $in: idsToRemove },
			}).exec();
			removedCount += result.deletedCount;
		}

		// Step 3: Return the count
		res.json({ message: `Removed ${removedCount} duplicate rooms.` });
	} catch (err) {
		console.log(err);
		res.status(400).json({ error: err.message });
	}
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
		const { checkin, checkout, accountId } = req.params;
		const startDate = new Date(checkin);
		const endDate = new Date(checkout);
		const hotelId = mongoose.Types.ObjectId(accountId);

		console.log(startDate, "startDate");
		console.log(endDate, "endDate");
		console.log(hotelId, "hotelId");

		// Ensure that the startDate and endDate are valid dates
		if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
			return res.status(400).json({ error: "Invalid date format" });
		}

		// Aggregate total rooms by type, including room pricing
		const totalRoomsByType = await Rooms.aggregate([
			{ $match: { hotelId: hotelId } },
			{
				$group: {
					_id: "$room_type",
					totalRooms: { $sum: 1 },
					roomPricing: { $first: "$room_pricing" },
				},
			},
		]);

		// Construct the match stage for new and pre-reservations
		const matchStage = {
			$match: {
				$or: [
					{ checkin_date: { $lte: endDate, $gte: startDate } },
					{ checkout_date: { $lte: endDate, $gte: startDate } },
					{
						checkin_date: { $lte: startDate },
						checkout_date: { $gte: endDate },
					},
				],
			},
		};

		// Find overlapping new reservations
		const overlappingNewReservations = await Reservations.aggregate([
			matchStage,
			{
				$match: {
					hotelId: hotelId,
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
			matchStage,
			{
				$match: {
					hotelId: hotelId,
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

// Translation map for Arabic to English room names
const translations = {
	"غرفه ثلاثى": "Triple Room",
	"غرفه رباعية": "Quadruple Room",
	"غرفه عائلية": "Family Room",
	"سويت بغرفتين": "Suite",
	"غرفة لذوى الأحتياجات الخاصة": "Accessible Room",
	"غرفه ثلاثى ": "Triple Room", // Note the space at the end
	// Add more translations as needed
};

// Generalized frontend room types mapping to specific Hotel Runner room types
const roomTypeMapping = {
	doubleRooms: "Double Room", // Maps to "Double Room" in HotelRunner
	singleRooms: "Single Room", // Maps to "Single Room" in HotelRunner
	tripleRooms: "غرفه ثلاثى ", // Maps to "غرفه ثلاثى " in HotelRunner
	quadRooms: "غرفه رباعية", // Maps to "غرفه رباعية" in HotelRunner
	familyRooms: "غرفه عائلية", // Maps to "غرفه عائلية" in HotelRunner
	suite: "سويت بغرفتين", // Maps to "سويت بغرفتين" in HotelRunner
	accessibleRoom: "غرفة لذوى الأحتياجات الخاصة", // Maps to "غرفة لذوى الأحتياجات الخاصة" in HotelRunner
	// ... add more mappings as needed ...
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
			const roomTypeMapping = {
				doubleRooms: "Double Room",
				singleRooms: "Single Room",
				tripleRooms: "غرفه ثلاثى ",
				quadRooms: "غرفه رباعية",
				familyRooms: "غرفه عائلية",
				suite: "سويت بغرفتين",
				accessibleRoom: "غرفة لذوى الأحتياجات الخاصة",
				// ... add more mappings as needed ...
			};

			const translatedRoomType =
				roomTypeMapping[frontendRoomType] || frontendRoomType;

			if (!translatedRoomType) {
				console.error(
					"No mapping found for frontend room type:",
					frontendRoomType
				);
				return null;
			}

			const matchingRoom = data.rooms.find(
				(room) => room.name.toLowerCase() === translatedRoomType.toLowerCase()
			);

			if (!matchingRoom) {
				console.error("No matching room found for:", translatedRoomType);
				return null;
			}

			return matchingRoom.code; // Use the 'code' property for the room code
		}
	} catch (error) {
		console.error("Error fetching room types and codes:", error);
	}

	return null; // Return null if no match is found
};

exports.updateRoomInventory = async (req, res) => {
	const token = process.env.HOTEL_RUNNER_TOKEN;
	const hrId = process.env.HR_ID;

	console.log(req.body, "update hotel runner");

	const {
		roomTypes, // Array of room types from the frontend
		startDate,
		endDate,
		availability, // This is also an array
		minStay,
	} = req.body;

	try {
		let updateResults = [];

		for (let i = 0; i < roomTypes.length; i++) {
			const roomType = roomTypes[i];
			const avail = availability[i]; // Get the corresponding availability

			const roomCode = await mapRoomTypeToCode(roomType);
			console.log(roomCode, "roomCode for", roomType);

			if (!roomCode) {
				console.error("Invalid room type:", roomType);
				updateResults.push({
					roomType,
					success: false,
					reason: "Invalid room type",
				});
				continue; // Skip this iteration if room code is not found
			}

			const url = `https://app.hotelrunner.com/api/v2/apps/rooms/`;
			const params = new URLSearchParams({
				hr_id: hrId,
				token: token,
				room_code: roomCode,
				start_date: startDate,
				end_date: endDate,
				availability: avail, // Use the specific availability for this room type
				stop_sale: false,
			});

			if (minStay) params.append("min_stay", minStay);

			const response = await fetch(url, {
				method: "PUT",
				body: params,
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
			});

			if (!response.ok) {
				const responseBody = await response.text(); // or response.json() if the response is in JSON format
				console.error("API Response:", responseBody);
			}

			if (response.ok) {
				updateResults.push({ roomType, success: true });
			} else {
				console.error("Failed to update for", roomType, "with code", roomCode);
				updateResults.push({
					roomType,
					success: false,
					reason: "API request failed",
				});
			}
		}

		if (updateResults.every((result) => result.success)) {
			res.json({
				message: "Room inventory updated successfully",
				updateResults,
			});
		} else {
			res
				.status(500)
				.json({ error: "Failed to update room inventory", updateResults });
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

exports.reservedRoomsSummary = async (req, res) => {
	const { startdate, enddate, accountId } = req.params;
	const belongsTo = mongoose.Types.ObjectId(accountId);

	try {
		// Aggregate to count the reserved rooms within the specified date range
		const reservedRooms = await Reservations.aggregate([
			{
				belongsTo: belongsTo,
				$match: {
					$or: [{ roomId: { $eq: [] } }, { roomId: { $eq: [null] } }],
					checkin_date: { $gte: new Date(startdate) },
					checkout_date: { $lte: new Date(enddate) },
				},
			},
			{ $unwind: "$pickedRoomsType" },
			{
				$addFields: {
					simplifiedRoomType: {
						$switch: {
							branches: [
								{
									case: {
										$regexMatch: {
											input: { $toLower: "$pickedRoomsType.room_type" },
											regex: "quadrooms|quadruple",
										},
									},
									then: "quadRooms",
								},
								{
									case: {
										$regexMatch: {
											input: { $toLower: "$pickedRoomsType.room_type" },
											regex: "triplerooms|triple",
										},
									},
									then: "tripleRooms",
								},
								{
									case: {
										$regexMatch: {
											input: { $toLower: "$pickedRoomsType.room_type" },
											regex: "doublerooms|double",
										},
									},
									then: "doubleRooms",
								},
								{
									case: {
										$regexMatch: {
											input: { $toLower: "$pickedRoomsType.room_type" },
											regex: "suite",
										},
									},
									then: "suite",
								},
								{
									case: {
										$regexMatch: {
											input: { $toLower: "$pickedRoomsType.room_type" },
											regex: "familyrooms|family",
										},
									},
									then: "familyRooms",
								},
							],
							default: "$pickedRoomsType.room_type",
						},
					},
				},
			},
			{
				$group: {
					_id: "$simplifiedRoomType",
					reserved: { $sum: 1 },
				},
			},
		]);

		const occupiedRooms = await Reservations.aggregate([
			{
				$match: {
					belongsTo: belongsTo,
					roomId: { $not: { $size: 0 } },
					checkin_date: { $gte: new Date(startdate) },
					checkout_date: { $lte: new Date(enddate) },
				},
			},
			{ $unwind: "$pickedRoomsType" },
			{
				$addFields: {
					simplifiedRoomType: {
						$switch: {
							branches: [
								{
									case: {
										$regexMatch: {
											input: { $toLower: "$pickedRoomsType.room_type" },
											regex: "quadrooms|quadruple",
										},
									},
									then: "quadRooms",
								},
								{
									case: {
										$regexMatch: {
											input: { $toLower: "$pickedRoomsType.room_type" },
											regex: "triplerooms|triple",
										},
									},
									then: "tripleRooms",
								},
								{
									case: {
										$regexMatch: {
											input: { $toLower: "$pickedRoomsType.room_type" },
											regex: "doublerooms|double",
										},
									},
									then: "doubleRooms",
								},
								{
									case: {
										$regexMatch: {
											input: { $toLower: "$pickedRoomsType.room_type" },
											regex: "suite",
										},
									},
									then: "suite",
								},
								{
									case: {
										$regexMatch: {
											input: { $toLower: "$pickedRoomsType.room_type" },
											regex: "familyrooms|family",
										},
									},
									then: "familyRooms",
								},
							],
							default: "$pickedRoomsType.room_type",
						},
					},
				},
			},
			{
				$group: {
					_id: "$simplifiedRoomType",
					occupied: { $sum: 1 },
				},
			},
		]);

		// const debugRooms = await Reservations.aggregate([
		// 	// ... Replicate your existing match, unwind, and addFields stages ...
		// 	{
		// 		$project: {
		// 			simplifiedRoomType: 1,
		// 			originalRoomType: "$pickedRoomsType.room_type",
		// 		},
		// 	},
		// ]);

		// Get the total number of rooms from the Rooms schema
		const totalRooms = await Rooms.aggregate([
			{
				$match: {
					belongsTo: belongsTo,
					roomId: { $not: { $size: 0 } },
					checkin_date: { $gte: new Date(startdate) },
					checkout_date: { $lte: new Date(enddate) },
				},
			},
			{
				$group: {
					_id: "$room_type",
					total_available: { $sum: 1 },
				},
			},
		]);

		// Merging reserved and occupied counts with total rooms
		const summary = totalRooms.map((room) => {
			const reservedRoom = reservedRooms.find((r) => r._id === room._id) || {
				reserved: 0,
			};
			const occupiedRoom = occupiedRooms.find((r) => r._id === room._id) || {
				occupied: 0,
			};
			return {
				room_type: room._id,
				total_available: room.total_available,
				reserved: reservedRoom.reserved,
				occupied: occupiedRoom.occupied,
				available:
					room.total_available - reservedRoom.reserved - occupiedRoom.occupied,
				start_date: startdate,
				end_date: enddate,
			};
		});
		console.log(summary, "summary");
		res.json(summary);
	} catch (error) {
		console.error("Error in reservedRoomsSummary:", error);
		res.status(500).send("Error fetching reserved rooms summary");
	}
};
