const Janat = require("../models/janat");
const HotelDetails = require("../models/hotel_details");
const mongoose = require("mongoose");

exports.createUpdateDocument = (req, res) => {
	const { documentId } = req.params;

	// Check if documentId is provided and is a valid ObjectId
	if (documentId && mongoose.Types.ObjectId.isValid(documentId)) {
		const condition = { _id: mongoose.Types.ObjectId(documentId) };
		const update = req.body;

		Janat.findOneAndUpdate(condition, update, { new: true }, (err, data) => {
			if (err) {
				console.error(err);
				return res.status(500).json({
					error: "Error in updating document",
				});
			}

			if (!data) {
				return res.status(404).json({
					message: "Document not found with the provided ID",
				});
			}

			return res.status(200).json({
				message: "Document updated successfully",
				data,
			});
		});
	} else {
		// If documentId is not provided, create a new document
		const newDocument = new Janat(req.body);

		newDocument.save((err, data) => {
			if (err) {
				console.error(err);
				return res.status(500).json({
					error: "Error in creating new document",
				});
			}

			return res.status(201).json({
				message: "New document created successfully",
				data,
			});
		});
	}
};

exports.list = (req, res) => {
	Janat.find({}).exec((err, documents) => {
		if (err) {
			return res.status(500).json({
				error: "There was an error retrieving the documents",
			});
		}
		res.json(documents);
	});
};

exports.listOfAllActiveHotels = async (req, res) => {
	try {
		const activeHotels = await HotelDetails.find({
			activateHotel: true,
			hotelPhotos: { $exists: true, $not: { $size: 0 } },
			"location.coordinates": { $ne: [0, 0] },
			roomCountDetails: {
				$elemMatch: {
					"price.basePrice": { $gt: 0 },
					photos: { $exists: true, $not: { $size: 0 } },
				},
			},
		});

		res.json(activeHotels);
	} catch (err) {
		console.error(err);
		res
			.status(500)
			.json({ error: "An error occurred while fetching active hotels." });
	}
};

exports.distinctRoomTypes = async (req, res) => {
	try {
		const activeHotels = await HotelDetails.find({
			activateHotel: true,
			hotelPhotos: { $exists: true, $not: { $size: 0 } },
			"location.coordinates": { $ne: [0, 0] },
			roomCountDetails: {
				$elemMatch: {
					"price.basePrice": { $gt: 0 },
					photos: { $exists: true, $not: { $size: 0 } },
				},
			},
		});

		// Extract distinct room types, display names, and _id
		let roomTypes = [];
		activeHotels.forEach((hotel) => {
			hotel.roomCountDetails.forEach((room) => {
				if (room.price.basePrice > 0 && room.photos.length > 1) {
					roomTypes.push({
						roomType: room.roomType,
						displayName: room.displayName,
						_id: room._id,
					});
				}
			});
		});

		// Remove duplicates
		roomTypes = roomTypes.filter(
			(value, index, self) =>
				index ===
				self.findIndex(
					(t) =>
						t.roomType === value.roomType && t.displayName === value.displayName
				)
		);

		res.json(roomTypes);
	} catch (err) {
		console.error(err);
		res
			.status(500)
			.json({ error: "An error occurred while fetching distinct room types." });
	}
};

exports.getHotelFromSlug = async (req, res) => {
	try {
		const { hotelSlug } = req.params;

		// Find the hotel where hotelName (with spaces replaced by '-') matches hotelSlug
		const hotel = await HotelDetails.findOne({
			hotelName: {
				$regex: new RegExp(`^${hotelSlug.replace(/-/g, " ")}$`, "i"),
			},
		});

		if (!hotel) {
			return res.status(404).json({
				message: "No hotel found for the provided slug.",
			});
		}

		res.status(200).json(hotel);
	} catch (error) {
		console.error("Error fetching hotel by slug:", error);
		res.status(500).json({
			error: "An error occurred while fetching the hotel.",
		});
	}
};

exports.getListOfHotels = async (req, res) => {
	try {
		// Find all hotels where:
		// 1. hotelPhotos exist and is not empty
		// 2. activateHotel is true
		// 3. location coordinates are not [0, 0]
		const hotels = await HotelDetails.find({
			hotelPhotos: { $exists: true, $not: { $size: 0 } },
			activateHotel: true,
			"location.coordinates": { $ne: [0, 0] },
		});

		if (!hotels.length) {
			return res.status(404).json({
				message: "No hotels found with the specified criteria.",
			});
		}

		res.status(200).json(hotels);
	} catch (error) {
		console.error("Error fetching hotels:", error);
		res.status(500).json({
			error: "An error occurred while fetching hotels.",
		});
	}
};
