const HotelDetails = require("../models/hotel_details");
const mongoose = require("mongoose");
const _ = require("lodash");

exports.hotelDetailsById = (req, res, next, id) => {
	if (!mongoose.Types.ObjectId.isValid(id)) {
		return res.status(400).json({ error: "Invalid hotel ID" });
	}

	HotelDetails.findById(id).exec((err, hotelDetails) => {
		if (err || !hotelDetails) {
			return res.status(400).json({
				error: "Hotel details were not found",
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
				error: "Cannot create hotel details",
			});
		}
		res.json({ data });
	});
};

exports.read = (req, res) => {
	return res.json(req.hotelDetails);
};

exports.updateHotelDetails = (req, res) => {
	const hotelDetailsId = req.params.hotelId;
	const updateData = req.body;
	console.log("req.body      ", req.body);

	if (req.body.fromPage === "AddNew") {
		HotelDetails.findById(hotelDetailsId, (err, hotelDetails) => {
			if (err) {
				console.error(err);
				return res.status(500).send({ error: "Internal server error" });
			}
			if (!hotelDetails) {
				return res.status(404).send({ error: "Hotel details not found" });
			}

			if (
				updateData.roomCountDetails &&
				Array.isArray(updateData.roomCountDetails)
			) {
				const updatedRoomCountDetails = hotelDetails.roomCountDetails.map(
					(existingRoom) => {
						const matchingNewRoom = updateData.roomCountDetails.find(
							(newRoom) =>
								newRoom.roomType === existingRoom.roomType &&
								newRoom.displayName === existingRoom.displayName
						);

						if (matchingNewRoom && Object.keys(matchingNewRoom).length > 0) {
							// Update the existing room with the new details
							return { ...existingRoom, ...matchingNewRoom };
						}
						return existingRoom;
					}
				);

				// Add new rooms that don't exist in the current list
				updateData.roomCountDetails.forEach((newRoom) => {
					if (
						newRoom.roomType &&
						newRoom.displayName &&
						Object.keys(newRoom).length > 0
					) {
						const existingRoom = updatedRoomCountDetails.find(
							(room) =>
								room.roomType === newRoom.roomType &&
								room.displayName === newRoom.displayName
						);
						if (!existingRoom) {
							updatedRoomCountDetails.push(newRoom);
						}
					}
				});

				hotelDetails.roomCountDetails = updatedRoomCountDetails;
				hotelDetails.markModified("roomCountDetails"); // Mark the array as modified
			}

			// Update other fields (excluding roomCountDetails)
			Object.keys(updateData).forEach((key) => {
				if (key !== "roomCountDetails") {
					hotelDetails[key] = updateData[key];
				}
			});

			hotelDetails.save((err, updatedHotelDetails) => {
				if (err) {
					console.error(err);
					return res.status(500).send({ error: "Internal server error" });
				}
				res.json(updatedHotelDetails);
			});
		});
	} else {
		HotelDetails.findById(hotelDetailsId, (err, hotelDetails) => {
			if (err) {
				console.error(err);
				return res.status(500).send({ error: "Internal server error" });
			}
			if (!hotelDetails) {
				return res.status(404).send({ error: "Hotel details not found" });
			}

			if (
				updateData.roomCountDetails &&
				Array.isArray(updateData.roomCountDetails)
			) {
				const updatedRoomCountDetails = hotelDetails.roomCountDetails.map(
					(existingRoom) => {
						const matchingNewRoom = updateData.roomCountDetails.find(
							(newRoom) =>
								newRoom.roomType === existingRoom.roomType &&
								newRoom.displayName === existingRoom.displayName
						);

						if (matchingNewRoom && Object.keys(matchingNewRoom).length > 0) {
							// Update the existing room with the new details
							return { ...existingRoom, ...matchingNewRoom };
						}
						return existingRoom;
					}
				);

				// Add new rooms that don't exist in the current list
				updateData.roomCountDetails.forEach((newRoom) => {
					if (
						newRoom.roomType &&
						newRoom.displayName &&
						Object.keys(newRoom).length > 0
					) {
						const existingRoom = updatedRoomCountDetails.find(
							(room) =>
								room.roomType === newRoom.roomType &&
								room.displayName === newRoom.displayName
						);
						if (!existingRoom) {
							updatedRoomCountDetails.push(newRoom);
						}
					}
				});

				hotelDetails.roomCountDetails = updatedRoomCountDetails;
				hotelDetails.markModified("roomCountDetails"); // Mark the array as modified
			}

			// Update other fields (excluding roomCountDetails)
			Object.keys(updateData).forEach((key) => {
				if (key !== "roomCountDetails") {
					hotelDetails[key] = updateData[key];
				}
			});

			hotelDetails.save((err, updatedHotelDetails) => {
				if (err) {
					console.error(err);
					return res.status(500).send({ error: "Internal server error" });
				}
				res.json(updatedHotelDetails);
			});
		});
	}
};

exports.list = (req, res) => {
	const userId = mongoose.Types.ObjectId(req.params.accountId);

	HotelDetails.find({ belongsTo: userId })
		.populate("belongsTo", "name email") // Select only necessary fields
		.exec((err, data) => {
			if (err) {
				console.log(err, "err");
				return res.status(400).json({ error: err });
			}
			res.json(data);
		});
};

exports.remove = (req, res) => {
	const hotelDetails = req.hotelDetails;

	hotelDetails.remove((err) => {
		if (err) {
			return res.status(400).json({ error: "Error while removing" });
		}
		res.json({ message: "Hotel details deleted" });
	});
};

exports.getHotelDetails = (req, res) => {
	return res.json(req.hotelDetails);
};

exports.listForAdmin = (req, res) => {
	HotelDetails.find()
		.populate("belongsTo", "name email") // Select only necessary fields
		.exec((err, data) => {
			if (err) {
				return res.status(400).json({ error: err });
			}
			res.json(data);
		});
};
