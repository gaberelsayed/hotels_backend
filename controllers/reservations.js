const Reservations = require("../models/reservations");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const fetch = require("node-fetch");
const Rooms = require("../models/rooms");
const xlsx = require("xlsx");

exports.reservationById = (req, res, next, id) => {
	Reservations.findById(id).exec((err, reservations) => {
		if (err || !reservations) {
			return res.status(400).json({
				error: "reservations was not found",
			});
		}
		req.reservations = reservations;
		next();
	});
};

function generateRandomNumber() {
	let randomNumber = Math.floor(1000000000 + Math.random() * 9000000000); // Generates a 10-digit number
	return randomNumber.toString();
}

// Modified ensureUniqueNumber function to accept field name
function ensureUniqueNumber(model, fieldName, callback) {
	const randomNumber = generateRandomNumber();
	let query = {};
	query[fieldName] = randomNumber;
	model.findOne(query, (err, doc) => {
		if (err) {
			callback(err);
		} else if (doc) {
			ensureUniqueNumber(model, fieldName, callback); // Recursively generate a new number if the current one exists
		} else {
			callback(null, randomNumber);
		}
	});
}

exports.create = (req, res) => {
	// Function to handle the final saving process
	const saveReservation = (reservationData) => {
		const reservations = new Reservations(reservationData);
		reservations.save((err, data) => {
			if (err) {
				console.log(err, "err");
				return res.status(400).json({
					error: "Cannot Create reservations",
				});
			}
			res.json({ data });
		});
	};

	// Check if the confirmation_number is provided in the request body
	if (!req.body.confirmation_number) {
		// Generate unique confirmation_number
		ensureUniqueNumber(
			Reservations,
			"confirmation_number",
			(err, uniqueNumber) => {
				if (err) {
					return res
						.status(500)
						.json({ error: "Error checking for unique number" });
				}
				req.body.confirmation_number = uniqueNumber;
				// Proceed to save reservation
				saveReservation(req.body);
			}
		);
	} else {
		// Proceed to save reservation
		saveReservation(req.body);
	}
};

exports.reservationSearchAllList = async (req, res) => {
	try {
		const { searchQuery, accountId } = req.params;
		const hotelId = mongoose.Types.ObjectId(accountId);

		// Create a regex pattern to match the search query in a case-insensitive manner
		const searchPattern = new RegExp(searchQuery, "i");

		// Query to search across various fields
		const query = {
			hotelId: hotelId,
			$or: [
				{ "customer_details.name": searchPattern },
				{ "customer_details.phone": searchPattern },
				{ "customer_details.email": searchPattern },
				{ "customer_details.passport": searchPattern },
				{ "customer_details.passportExpiry": searchPattern },
				{ "customer_details.nationality": searchPattern },
				{ confirmation_number: searchPattern },
				{ reservation_id: searchPattern },
				{ reservation_status: searchPattern },
			],
		};

		// Fetch the first matching document
		const reservation = await Reservations.findOne(query).populate("belongsTo");

		if (!reservation) {
			return res.status(404).json({
				error: "No reservation found matching the search criteria.",
			});
		}

		res.json(reservation);
	} catch (error) {
		res.status(500).send("Server error");
	}
};

exports.reservationSearch = async (req, res) => {
	try {
		const { searchQuery, accountId } = req.params;
		const hotelId = mongoose.Types.ObjectId(accountId);
		// Create a regex pattern to match the search query in a case-insensitive manner
		const searchPattern = new RegExp(searchQuery, "i");

		// Query to search across various fields
		const query = {
			hotelId: hotelId,
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
		const reservation = await Reservations.findOne(query).populate("belongsTo");

		if (!reservation) {
			return res.status(404).json({
				error: "No reservation found matching the search criteria.",
			});
		}

		res.json(reservation);
	} catch (error) {
		res.status(500).send("Server error");
	}
};

// Normalize room names
function normalizeRoomName(apiRoomName) {
	return apiRoomName.split(" - ")[0].trim();
}

// Mapping function for room type
function mapRoomType(apiRoomName) {
	const normalizedRoomName = normalizeRoomName(apiRoomName);
	const roomTypeMappings = {
		// Add mappings similar to your previous implementation
	};
	return roomTypeMappings[normalizedRoomName] || normalizedRoomName;
}

// Main mapping function for Hotel Runner response to reservationsSchema
function mapHotelRunnerResponseToSchema(apiResponse) {
	const mappedRooms = apiResponse.rooms.map((room) => ({
		room_type: mapRoomType(room.name),
		chosenPrice: room.total,
		count: 1, // Assuming each room object represents one room
	}));

	return {
		reservation_id: apiResponse.hr_number,
		hr_number: apiResponse.hr_number,
		confirmation_number: apiResponse.provider_number.toString(),
		pms_number: apiResponse.pms_number,
		booking_source: apiResponse.channel_display.toLowerCase(),
		customer_details: {
			name: `${apiResponse.firstname} ${apiResponse.lastname}`,
			phone: apiResponse.address.phone,
			email: apiResponse.address.email,
			passport: apiResponse.guest_national_id,
			nationality: apiResponse.country,
		},
		state: apiResponse.state,
		reservation_status: apiResponse.state,
		total_guests: apiResponse.total_guests,
		total_rooms: apiResponse.total_rooms,
		cancel_reason: apiResponse.cancel_reason,
		booked_at: new Date(apiResponse.completed_at),
		sub_total: apiResponse.sub_total,
		extras_total: apiResponse.extras_total,
		tax_total: apiResponse.tax_total,
		total_amount: apiResponse.total,
		currency: apiResponse.currency,
		checkin_date: new Date(apiResponse.checkin_date),
		checkout_date: new Date(apiResponse.checkout_date),
		comment: apiResponse.note,
		payment: apiResponse.payment,
		payment_details: apiResponse.payment_details,
		paid_amount: apiResponse.paid_amount,
		payments: apiResponse.payments,
		pickedRoomsType: mappedRooms,
		days_of_residence: calculateDaysBetweenDates(
			apiResponse.checkin_date,
			apiResponse.checkout_date
		),
		// Assuming roomId, belongsTo, and hotelId will be set in the main function
	};
}

// Helper function for date difference
function calculateDaysBetweenDates(startDate, endDate) {
	const start = new Date(startDate);
	const end = new Date(endDate);
	return (end - start) / (1000 * 60 * 60 * 24);
}

// Main function to save reservations from channel manager
exports.saveReservationsChannelManager = async (req, res) => {
	const token = process.env.HOTEL_RUNNER_TOKEN;
	const hrId = process.env.HR_ID;
	const hotelId = req.params.hotelId;
	const belongsTo = req.params.belongsTo;
	let currentPage = parseInt(req.params.page, 10);

	try {
		let allProcessedReservations = [];

		// Loop to fetch and process reservations
		for (let i = 0; i < 5; i++) {
			const queryParams = new URLSearchParams({
				token: token,
				hr_id: hrId,
				undelivered: "false",
				modified: "false",
				per_page: 15,
				page: currentPage - i,
			}).toString();

			const url = `https://app.hotelrunner.com/api/v2/apps/reservations?${queryParams}`;

			const apiResponse = await fetch(url);
			if (!apiResponse.ok) {
				throw new Error(`HTTP error! status: ${apiResponse.status}`);
			}
			const data = await apiResponse.json();

			if (!data.reservations || data.reservations.length === 0) {
				continue; // Skip to next iteration if no reservations
			}

			const reservationPromises = data.reservations.map(async (reservation) => {
				const mappedReservation = mapHotelRunnerResponseToSchema(reservation);
				mappedReservation.belongsTo = belongsTo;
				mappedReservation.hotelId = hotelId;

				// Check for existing reservation
				const existingReservation = await Reservations.findOne({
					$or: [
						{ confirmation_number: mappedReservation.confirmation_number },
						{ reservation_id: mappedReservation.reservation_id },
					],
				});

				// Save new reservation if it does not exist
				if (!existingReservation) {
					return new Reservations(mappedReservation).save();
				}
			});

			// Concatenate processed reservations
			const processedReservations = await Promise.all(reservationPromises);
			allProcessedReservations = allProcessedReservations.concat(
				processedReservations.filter(Boolean)
			);
		}

		// Return response
		res.json({
			message: "Reservations processed successfully",
			processedReservations: allProcessedReservations,
		});
	} catch (error) {
		console.error("API request error:", error);
		res
			.status(500)
			.json({ error: "Error fetching and processing reservations" });
	}
};

exports.singleReservationHotelRunner = (req, res) => {
	const token = process.env.HOTEL_RUNNER_TOKEN;
	const hrId = process.env.HR_ID;
	const reservationNumber = req.params.reservationNumber;

	const queryParams = new URLSearchParams({
		token: token,
		hr_id: hrId,
		undelivered: "false", // Assuming 'false' will include all reservations
		modified: "false", // Assuming 'false' will not filter out unmodified reservations
		per_page: "1", // Example: Adjust as needed based on the maximum allowed by the API
		reservation_number: reservationNumber,
		// You can add more parameters here as required.
	}).toString();

	const url = `https://app.hotelrunner.com/api/v2/apps/reservations?${queryParams}`;

	fetch(url)
		.then((apiResponse) => {
			if (!apiResponse.ok) {
				throw new Error(`HTTP error! status: ${apiResponse.status}`);
			}
			return apiResponse.json();
		})
		.then((data) => {
			res.json(data); // Send back the data received from the HotelRunner API
		})
		.catch((error) => {
			console.error("API request error:", error);
			res.status(500).json({ error: "Error fetching reservations" });
		});
};

exports.getListOfReservations = async (req, res) => {
	try {
		const { page, records, filters, hotelId, date } = req.params;
		const parsedPage = parseInt(page);
		const parsedRecords = parseInt(records);

		if (
			isNaN(parsedPage) ||
			isNaN(parsedRecords) ||
			!ObjectId.isValid(hotelId)
		) {
			return res.status(400).send("Invalid parameters");
		}

		const parsedFilters = JSON.parse(filters);
		const startDate = new Date(`${date}T00:00:00+03:00`);
		const endDate = new Date(`${date}T23:59:59+03:00`);

		let dynamicFilter = { hotelId: ObjectId(hotelId) };
		console.log(parsedFilters.selectedFilter, "parsedFilters.selectedFilter");
		switch (parsedFilters.selectedFilter) {
			case "Today's New Reservations":
				dynamicFilter.booked_at = { $gte: startDate, $lte: endDate };
				break;
			case "Cancelations":
				dynamicFilter.reservation_status = {
					$in: ["cancelled_by_guest", "canceled", "Cancelled", "cancelled"],
				};
				break;
			case "Today's Arrivals":
				dynamicFilter.checkin_date = { $gte: startDate, $lte: endDate };
				break;
			case "Today's Departures":
				dynamicFilter.checkout_date = { $gte: startDate, $lte: endDate };
				break;
			case "Incomplete reservations":
				dynamicFilter.reservation_status = { $nin: ["closed", "canceled"] };
				break;
			case "In House":
				dynamicFilter.reservation_status = { $eq: "inhouse" };
				break;
			// other cases...
		}

		const pipeline = [
			{ $match: dynamicFilter },
			{ $sort: { booked_at: -1 } },
			{ $skip: (parsedPage - 1) * parsedRecords },
			{ $limit: parsedRecords },
		];

		const reservations = await Reservations.aggregate(pipeline);
		res.json(reservations);
	} catch (error) {
		console.error(error);
		res.status(500).send("Server error: " + error.message);
	}
};

exports.totalRecordsReservations = async (req, res) => {
	try {
		const hotelId = req.params.hotelId;

		if (!ObjectId.isValid(hotelId)) {
			return res.status(400).send("Invalid hotelId parameter");
		}

		const total = await Reservations.countDocuments({
			hotelId: ObjectId(hotelId),
		});
		res.json({ total });
	} catch (error) {
		console.error("Error fetching total records:", error);
		res.status(500).send("Server error");
	}
};

exports.removeDuplicates_ConfirmationNumber = async (req, res) => {
	try {
		const groupedReservations = await Reservations.aggregate([
			{
				$sort: { createdAt: -1 },
			},
			{
				$group: {
					_id: "$confirmation_number",
					docId: { $first: "$_id" },
				},
			},
		]);

		const idsToKeep = groupedReservations.map((group) => group.docId);

		await Reservations.deleteMany({ _id: { $nin: idsToKeep } });

		res.json({ message: "Duplicates removed successfully" });
	} catch (error) {
		console.error("Error in removeDuplicates_ConfirmationNumber:", error);
		res.status(500).send("Internal Server Error");
	}
};

exports.singleReservation = (req, res) => {
	const token = process.env.HOTEL_RUNNER_TOKEN;
	const hrId = process.env.HR_ID;
	const reservationNumber = req.params.reservationNumber;
	const hotelId = req.params.hotelId; // Assuming you are passing hotelId as a parameter
	const belongsTo = req.params.belongsTo; // Assuming you are passing belongsTo as a parameter

	const queryParams = new URLSearchParams({
		token: token,
		hr_id: hrId,
		reservation_number: reservationNumber,
		// ... other query params
	}).toString();

	const url = `https://app.hotelrunner.com/api/v2/apps/reservations?${queryParams}`;

	fetch(url)
		.then((apiResponse) => {
			if (!apiResponse.ok) {
				throw new Error(`HTTP error! status: ${apiResponse.status}`);
			}
			return apiResponse.json();
		})
		.then((data) => {
			if (!data.reservations || data.reservations.length === 0) {
				throw new Error("No reservations found");
			}
			const reservation = data.reservations[0]; // Assuming we are interested in the first reservation

			const mappedReservation = mapHotelRunnerResponseToSchema(reservation);
			mappedReservation.belongsTo = belongsTo;
			mappedReservation.hotelId = hotelId;

			// Create a new PreReservation document
			return new PreReservation(mappedReservation).save();
		})
		.then((newReservation) => {
			res.json(newReservation); // Send back the newly created PreReservation document
		})
		.catch((error) => {
			console.error("API request error:", error);
			res
				.status(500)
				.json({ error: "Error fetching and processing reservation" });
		});
};

exports.hotelRunnerPaginatedList = (req, res) => {
	const token = process.env.HOTEL_RUNNER_TOKEN;
	const hrId = process.env.HR_ID;

	// Extract page and per_page from the route parameters
	const { page, per_page } = req.params;

	// Construct the query parameters
	const queryParams = new URLSearchParams({
		token: token,
		hr_id: hrId,
		undelivered: "false", // Assuming 'false' will include all reservations
		modified: "false", // Assuming 'false' will not filter out unmodified reservations
		page: page, // Use the page number from the route parameter
		per_page: per_page, // Use the per_page limit from the route parameter
	}).toString();

	const url = `https://app.hotelrunner.com/api/v2/apps/reservations?${queryParams}`;

	fetch(url)
		.then((apiResponse) => {
			if (!apiResponse.ok) {
				throw new Error(`HTTP error! status: ${apiResponse.status}`);
			}
			return apiResponse.json();
		})
		.then((data) => {
			res.json(data); // Send back the data received from the HotelRunner API
		})
		.catch((error) => {
			console.error("API request error:", error);
			res.status(500).json({ error: "Error fetching reservations" });
		});
};

exports.reservationsList = (req, res) => {
	const userId = mongoose.Types.ObjectId(req.params.accountId);
	const startDate = new Date(req.params.startdate);
	startDate.setHours(0, 0, 0, 0); // Set time to the start of the day

	const endDate = new Date(req.params.enddate);
	endDate.setHours(23, 59, 59, 999); // Set time to the end of the day

	let queryConditions = {
		hotelId: userId,
		checkin_date: { $gte: startDate },
		checkout_date: { $lte: endDate },
		$where: function () {
			return (
				this.roomId.length > 0 &&
				this.roomId.every((element) => element != null)
			);
		},
	};

	Reservations.find(queryConditions)
		.populate("belongsTo")
		.populate("roomId")
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

exports.reservationsList2 = (req, res) => {
	const userId = mongoose.Types.ObjectId(req.params.accountId);
	const today = new Date();
	const thirtyDaysAgo = new Date(today);
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	Reservations.find({
		hotelId: userId,
		checkin_date: {
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

exports.updateReservation = (req, res) => {
	const reservationId = req.params.reservationId;
	const updateData = req.body;

	// Validate reservationId if necessary

	// Update the reservation document
	Reservations.findByIdAndUpdate(
		reservationId,
		updateData,
		{ new: true }, // returns the updated document
		(err, updatedReservation) => {
			if (err) {
				// Handle possible errors
				console.error(err);
				return res.status(500).send({ error: "Internal server error" });
			}
			if (!updatedReservation) {
				// Handle the case where no reservation is found with the given ID
				return res.status(404).send({ error: "Reservation not found" });
			}
			// Successfully updated
			res.json(updatedReservation);
		}
	);
};

// Helper function to calculate days of residence
function calculateDaysOfResidence(startDate, endDate) {
	const start = new Date(startDate);
	const end = new Date(endDate);
	return (end - start) / (1000 * 60 * 60 * 24); // Difference in days
}

exports.agodaDataDump = async (req, res) => {
	try {
		const accountId = req.params.accountId;
		const userId = req.params.belongsTo;
		console.log(req.file, "req.file");

		const filePath = req.file.path; // The path to the uploaded file
		const workbook = xlsx.readFile(filePath);
		const sheetName = workbook.SheetNames[0];
		const sheet = workbook.Sheets[sheetName];
		const data = xlsx.utils.sheet_to_json(sheet); // Convert the sheet data to JSON
		// Filter out data that has confirmation numbers already in the database
		const existingConfirmationNumbers = await Reservations.find({
			booking_source: "agoda",
			hotelId: accountId,
		}).distinct("confirmation_number");

		const newRecords = data.filter((item) => {
			const itemNumber = item.BookingIDExternal_reference_ID.toString().trim();
			return !existingConfirmationNumbers.includes(itemNumber);
		});

		newRecords.forEach((item) => {
			const itemNumber = item.BookingIDExternal_reference_ID.toString().trim();
			if (existingConfirmationNumbers.includes(itemNumber)) {
				console.log(`Duplicate found: ${itemNumber}`);
			} else {
				// console.log(`New entry: ${itemNumber}`);
			}
		});

		// Group data by confirmation_number to handle potential duplicate entries
		const groupedByConfirmation = newRecords.reduce((acc, item) => {
			const key = item.BookingIDExternal_reference_ID;
			if (!acc[key]) {
				acc[key] = [];
			}
			acc[key].push(item);
			return acc;
		}, {});

		// Transform grouped data into reservations
		const transformedData = Object.values(groupedByConfirmation).map(
			(group) => {
				// Calculate total price per room type per day
				const daysOfResidence = calculateDaysOfResidence(
					group[0].StayDateFrom,
					group[0].StayDateTo
				);
				const pickedRoomsType = group.map((item) => ({
					room_type: item.RoomType,
					chosenPrice: item.Total_inclusive_rate / daysOfResidence || 0,
					count: 1, // Assuming each record is for one room
				}));

				// Pick the first item in the group to represent the common fields
				const firstItem = group[0];

				return {
					confirmation_number: firstItem.BookingIDExternal_reference_ID,
					booking_source: "agoda",
					customer_details: {
						name: firstItem.Customer_Name, // Concatenated first name and last name if available
						nationality: firstItem.Customer_Nationality,
						phone: firstItem.Customer_Phone || "",
						email: firstItem.Customer_Email || "",
					},
					state: "confirmed",
					reservation_status: firstItem.Status.toLowerCase(),
					total_guests: firstItem.No_of_adult + (firstItem.No_of_children || 0),
					total_rooms: group.length, // The number of items in the group
					cancel_reason: firstItem.CancellationPolicyDescription || "",
					booked_at: new Date(firstItem.BookedDate),
					sub_total: firstItem.Total_inclusive_rate,
					total_amount: firstItem.Total_inclusive_rate,
					currency: firstItem.Currency,
					checkin_date: new Date(firstItem.StayDateFrom),
					checkout_date: new Date(firstItem.StayDateTo),
					days_of_residence: daysOfResidence,
					comment: firstItem.Special_Request || "",
					commision: firstItem.Commission, // Note the misspelling of 'commission' here
					payment: firstItem.PaymentModel.toLowerCase(),
					pickedRoomsType,
					hotelId: accountId,
					belongsTo: userId,
				};
			}
		);

		if (transformedData.length > 0) {
			await Reservations.insertMany(transformedData);
			res.status(200).json({ message: "Data imported successfully" });
		} else {
			res.status(200).json({ message: "No new data to import" });
		}
	} catch (error) {
		console.error("Error in agodaDataDump:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

exports.expediaDataDump = async (req, res) => {
	try {
		const accountId = req.params.accountId;
		const userId = req.params.belongsTo;
		const filePath = req.file.path; // The path to the uploaded file
		const workbook = xlsx.readFile(filePath);
		const sheetName = workbook.SheetNames[0];
		const sheet = workbook.Sheets[sheetName];
		const data = xlsx.utils.sheet_to_json(sheet); // Convert the sheet data to JSON

		console.log(req.body, "req.body");
		console.log(req.file, "req.file");

		// Filter out data that has confirmation numbers already in the database
		const existingConfirmationNumbers = await Reservations.find({
			booking_source: "expedia",
			hotelId: accountId,
		}).distinct("confirmation_number");

		const newRecords = data.filter((item) => {
			const confirmationNumber = item["Confirmation #"]
				? item["Confirmation #"].toString().trim()
				: item["Reservation ID"].toString().trim();
			return !existingConfirmationNumbers.includes(confirmationNumber);
		});

		newRecords.forEach((item) => {
			const confirmationNumber = item["Confirmation #"]
				? item["Confirmation #"].toString().trim()
				: item["Reservation ID"].toString().trim();
			if (existingConfirmationNumbers.includes(confirmationNumber)) {
				console.log(`Duplicate found: ${confirmationNumber}`);
			} else {
				// console.log(`New entry: ${confirmationNumber}`);
			}
		});

		// Group data by confirmation_number to handle potential duplicate entries
		const groupedByConfirmation = newRecords.reduce((acc, item) => {
			// Use "Confirmation #" if available, otherwise fall back to "Reservation ID"
			const key = item["Confirmation #"] || item["Reservation ID"];
			if (!acc[key]) {
				acc[key] = [];
			}
			acc[key].push(item);
			return acc;
		}, {});

		// Transform grouped data into reservations
		const transformedData = Object.values(groupedByConfirmation).map(
			(group) => {
				// Calculate total price per room type per day
				const daysOfResidence = calculateDaysOfResidence(
					group[0]["Check-in"],
					group[0]["Check-out"]
				);
				const pickedRoomsType = group.map((item) => ({
					room_type: item.Room,
					chosenPrice: item["Booking amount"] / daysOfResidence || 0,
					count: 1, // Assuming each record is for one room
				}));

				// Pick the first item in the group to represent the common fields
				const firstItem = group[0];

				return {
					confirmation_number:
						firstItem["Confirmation #"] || firstItem["Reservation ID"],
					booking_source: "expedia",
					customer_details: {
						name: firstItem.Guest || "", // Assuming 'Guest' contains the full name
					},
					state: "confirmed",
					reservation_status: firstItem.Status.toLowerCase(),
					total_guests: 1, // Defaulting to 1 as specific guest count might not be available
					total_rooms: group.length, // The number of items in the group
					booked_at: new Date(firstItem.Booked),
					sub_total: firstItem["Booking amount"],
					total_amount: firstItem["Booking amount"],
					currency: "SAR", // Default to SAR if currency is not provided in the file
					checkin_date: new Date(firstItem["Check-in"]),
					checkout_date: new Date(firstItem["Check-out"]),
					days_of_residence: daysOfResidence,
					comment: firstItem["Special Request"] || "", // Replace with the actual column name if different
					payment: firstItem["Payment type"].toLowerCase(),
					pickedRoomsType,
					commision: firstItem.Commission, // Ensure this field exists in your schema
					hotelId: accountId,
					belongsTo: userId,
				};
			}
		);

		if (transformedData.length > 0) {
			await Reservations.insertMany(transformedData);
			res.status(200).json({ message: "Data imported successfully" });
		} else {
			res.status(200).json({ message: "No new data to import" });
		}
	} catch (error) {
		console.error("Error in expediaDataDump:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

exports.bookingDataDump = async (req, res) => {
	try {
		const accountId = req.params.accountId;
		const userId = req.params.belongsTo;
		const filePath = req.file.path; // The path to the uploaded file
		const workbook = xlsx.readFile(filePath);
		const sheetName = workbook.SheetNames[0];
		const sheet = workbook.Sheets[sheetName];
		let data = xlsx.utils.sheet_to_json(sheet); // Convert the sheet data to JSON

		// Convert keys of each item in data to lowercase
		data = data.map((item) => {
			const newItem = {};
			for (const key in item) {
				if (item.hasOwnProperty(key) && key) {
					newItem[key.toLowerCase()] = item[key];
				}
			}
			return newItem;
		});

		// Filter out data that has confirmation numbers already in the database
		const existingConfirmationNumbers = await Reservations.find({
			booking_source: "booking.com",
			hotelId: accountId, // Assuming this is how you determine ownership
		}).distinct("confirmation_number");

		const newRecords = data.filter((item) => {
			if (!item["book number"] || item["book number"] === null) {
				return false;
			}
			const itemNumber = item["book number"].toString().trim();
			return !existingConfirmationNumbers.includes(itemNumber);
		});

		newRecords.forEach((item) => {
			const itemNumber = item["book number"].toString().trim();
			if (existingConfirmationNumbers.includes(itemNumber)) {
				console.log(`Duplicate found: ${itemNumber}`);
			} else {
				// console.log(`New entry: ${itemNumber}`);
			}
		});

		// Group data by confirmation_number to handle potential duplicate entries
		const groupedByConfirmation = newRecords.reduce((acc, item) => {
			const key = item["book number"];
			if (!acc[key]) {
				acc[key] = [];
			}
			acc[key].push(item);
			return acc;
		}, {});

		const parsePrice = (priceString) => {
			// Check if the priceString is not undefined and is a string
			if (typeof priceString === "string" || priceString instanceof String) {
				return parseFloat(priceString.replace(/[^\d.-]/g, ""));
			}
			return 0; // Return 0 or some default value if the priceString is not a valid string
		};

		const calculateDaysOfResidence = (checkIn, checkOut) => {
			const checkInDate = new Date(checkIn);
			const checkOutDate = new Date(checkOut);

			// Validate if both dates are valid
			if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
				return 0; // Return a default value (e.g., 0) if dates are invalid
			}

			return (checkOutDate - checkInDate) / (1000 * 3600 * 24); // Calculating difference in days
		};

		const parseDate = (dateString) => {
			const date = new Date(dateString);
			return isNaN(date.getTime()) ? null : date;
		};

		// Transform grouped data into reservations
		const transformedData = Object.values(groupedByConfirmation).map(
			(group) => {
				// Calculate total price per room type per day
				const daysOfResidence = calculateDaysOfResidence(
					group[0]["check-in"],
					group[0]["check-out"]
				);

				const pickedRoomsType = group.map((item) => {
					const price = parsePrice(item.price);

					const chosenPrice = daysOfResidence > 0 ? price / daysOfResidence : 0;

					const peoplePerRoom = item.persons
						? item.persons
						: item.people / item.rooms;

					let roomType = "";
					if (peoplePerRoom <= 1) {
						roomType = "Single Room";
					} else if (peoplePerRoom <= 2) {
						roomType = "Double Room";
					} else if (peoplePerRoom === 3) {
						roomType = "Triple Room";
					} else if (peoplePerRoom === 4) {
						roomType = "Quad Room";
					} else {
						roomType = "Family Room";
					}
					return {
						room_type: roomType,
						chosenPrice: chosenPrice,
						count: 1, // Assuming each record is for one room
					};
				});

				// Pick the first item in the group to represent the common fields
				const firstItem = group[0];

				// ... Inside your transform logic
				const totalAmount = parsePrice(firstItem.price || "0 SAR"); // Provide a default string if Price is undefined

				const commission = parsePrice(
					firstItem["commission amount"] || "0 SAR"
				); // Provide a default string if Commission Amount is undefined

				// Use the parseDate function for date fields
				const bookedAt = parseDate(firstItem["booked on"]);
				const checkInDate = parseDate(firstItem["check-in"]);
				const checkOutDate = parseDate(firstItem["check-out"]);

				if (!bookedAt || !checkInDate || !checkOutDate) {
					console.error(
						`Invalid date found in record: ${JSON.stringify(firstItem)}`
					);
					// Optionally skip this record or handle the error as needed
				}

				return {
					confirmation_number: firstItem["book number"] || "",
					booking_source: "booking.com",
					customer_details: {
						name: firstItem["guest name(s)"] || "", // Assuming 'Guest Name(s)' contains the full name
					},
					state: "confirmed",
					reservation_status: firstItem.status,
					total_guests: firstItem.people || 1, // Total number of guests
					total_rooms: group.length, // The number of items in the group
					booked_at: bookedAt,
					checkin_date: checkInDate,
					checkout_date: checkOutDate,
					sub_total: totalAmount - commission,
					total_amount: totalAmount,
					currency: "SAR", // Adjust as needed
					days_of_residence: daysOfResidence,
					comment: firstItem.remarks || "",
					payment: firstItem["payment status"]
						? firstItem["payment status"]
						: "Not Paid",
					pickedRoomsType,
					commission: commission, // Ensure this field exists in your schema
					hotelId: accountId,
					belongsTo: userId,
				};
			}
		);

		if (transformedData.length > 0) {
			await Reservations.insertMany(transformedData);
			res.status(200).json({ message: "Data imported successfully" });
		} else {
			res.status(200).json({ message: "No new data to import" });
		}
	} catch (error) {
		console.error("Error in bookingDataDump:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
};
