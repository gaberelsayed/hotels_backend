const Reservations = require("../models/reservations");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const fetch = require("node-fetch");
const Rooms = require("../models/rooms");
const xlsx = require("xlsx");
const sgMail = require("@sendgrid/mail");
const puppeteer = require("puppeteer");
const { confirmationEmail, reservationUpdate } = require("./assets");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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

const createPdfBuffer = async (html) => {
	const browser = await puppeteer.launch({
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-dev-shm-usage",
			"--disable-accelerated-2d-canvas",
			"--no-first-run",
			"--no-zygote",
			"--single-process", // <- this one doesn't works in Windows
			"--disable-gpu",
		],
	});

	const page = await browser.newPage();
	await page.setContent(html, { waitUntil: "networkidle0" });
	const pdfBuffer = await page.pdf({ format: "A4" });
	await browser.close();
	return pdfBuffer;
};

const sendEmailWithPdf = async (reservationData) => {
	// Dynamically generating HTML content for the email body and PDF
	const htmlContent = confirmationEmail(reservationData);
	const pdfBuffer = await createPdfBuffer(htmlContent);

	const FormSubmittionEmail = {
		to: reservationData.customer_details.email,
		from: "noreply@janatbooking.com",
		// cc: [
		// 	{ email: "ayed.hotels@gmail.com" },
		// 	{ email: "zaerhotel@gmail.com" },
		// 	{ email: "3yedhotel@gmail.com" },
		// 	{ email: "morazzakhamouda@gmail.com" },
		// ],
		bcc: [
			{ email: "ayed.hotels@gmail.com" },
			{ email: "zaerhotel@gmail.com" },
			{ email: "3yedhotel@gmail.com" },
			{ email: "morazzakhamouda@gmail.com" },
			{ email: "ahmed.abdelrazak@infinite-apps.com" },
		],
		subject: `Janat Booking - Reservation Confirmation`,
		html: htmlContent,
		attachments: [
			{
				content: pdfBuffer.toString("base64"),
				filename: "Reservation_Confirmation.pdf",
				type: "application/pdf",
				disposition: "attachment",
			},
		],
	};

	try {
		await sgMail.send(FormSubmittionEmail);
	} catch (error) {
		console.error("Error sending email with PDF", error);
		// Handle error appropriately
	}
};

exports.create = async (req, res) => {
	console.log(req.body.sendEmail, "req.body.sendEmail");
	console.log(req.body.hotelName, "req.body.hotelName");

	const saveReservation = async (reservationData) => {
		const reservations = new Reservations(reservationData);
		try {
			const data = await reservations.save();
			res.json({ data });
			if (req.body.sendEmail) {
				await sendEmailWithPdf(reservationData);
			}
		} catch (err) {
			console.log(err, "err");
			return res.status(400).json({
				error: "Cannot Create reservations",
			});
		}
	};

	if (!req.body.confirmation_number) {
		ensureUniqueNumber(
			Reservations,
			"confirmation_number",
			async (err, uniqueNumber) => {
				if (err) {
					return res
						.status(500)
						.json({ error: "Error checking for unique number" });
				}
				req.body.confirmation_number = uniqueNumber;
				saveReservation(req.body);
			}
		);
	} else {
		saveReservation(req.body);
	}
};

exports.sendReservationEmail = async (req, res) => {
	const reservationData = req.body; // Assuming the reservation ID is sent in the request body
	// Fetch the reservation data based on reservationId
	// This is a placeholder, replace it with your actual data fetching logic

	if (!reservationData) {
		return res.status(404).json({ error: "Reservation not found" });
	}

	try {
		await sendEmailWithPdf(reservationData);
		res.json({ message: "Email sent successfully" });
	} catch (error) {
		console.error("Error sending email:", error);
		res.status(500).json({ error: "Failed to send email" });
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

		const today = new Date();
		const yesterday = new Date();
		yesterday.setDate(today.getDate() - 1);

		const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0));
		const endOfToday = new Date(today.setHours(23, 59, 59, 999));

		const parsedFilters = JSON.parse(filters);
		const startDate = new Date(`${date}T00:00:00+03:00`);
		const endDate = new Date(`${date}T23:59:59+03:00`);

		let dynamicFilter = { hotelId: ObjectId(hotelId) };
		switch (parsedFilters.selectedFilter) {
			case "Today's New Reservations":
				dynamicFilter.booked_at = { $gte: startOfYesterday, $lte: endOfToday };
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
			{ $sort: { booked_at: -1 } }, // Sort by booked_at in descending order
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

		const today = new Date();
		const yesterday = new Date();
		yesterday.setDate(today.getDate() - 1);

		const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0));
		const endOfToday = new Date(today.setHours(23, 59, 59, 999));

		const parsedFilters = JSON.parse(filters);
		const startDate = new Date(`${date}T00:00:00+03:00`);
		const endDate = new Date(`${date}T23:59:59+03:00`);

		let dynamicFilter = { hotelId: ObjectId(hotelId) };
		switch (parsedFilters.selectedFilter) {
			case "Today's New Reservations":
				dynamicFilter.booked_at = { $gte: startOfYesterday, $lte: endOfToday };
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

		const total = await Reservations.countDocuments(dynamicFilter);
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

exports.reservationsList = (req, res) => {
	const hotelId = mongoose.Types.ObjectId(req.params.accountId);
	const userId = mongoose.Types.ObjectId(req.params.belongsTo);

	const startDate = new Date(req.params.startdate);
	startDate.setHours(0, 0, 0, 0); // Set time to the start of the day

	const endDate = new Date(req.params.enddate);
	endDate.setHours(23, 59, 59, 999); // Set time to the end of the day

	let queryConditions = {
		hotelId: hotelId,
		belongsTo: userId,
		checkin_date: { $gte: startDate },
		checkout_date: { $lte: endDate },
		roomId: { $exists: true, $ne: [], $not: { $elemMatch: { $eq: null } } },
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

const sendEmailUpdate = async (reservationData, hotelName) => {
	// Dynamically generating HTML content for the email body and PDF
	const htmlContent = reservationUpdate(reservationData, hotelName);
	const pdfBuffer = await createPdfBuffer(htmlContent);

	const FormSubmittionEmail = {
		to: reservationData.customer_details.email,
		from: "noreply@janatbooking.com",
		// cc: [
		// 	{ email: "ayed.hotels@gmail.com" },
		// 	{ email: "zaerhotel@gmail.com" },
		// 	{ email: "3yedhotel@gmail.com" },
		// 	{ email: "morazzakhamouda@gmail.com" },
		// ],
		bcc: [
			{ email: "ayed.hotels@gmail.com" },
			{ email: "zaerhotel@gmail.com" },
			{ email: "3yedhotel@gmail.com" },
			{ email: "morazzakhamouda@gmail.com" },
			{ email: "ahmed.abdelrazak@infinite-apps.com" },
		],
		subject: `Janat Booking - Reservation Update`,
		html: htmlContent,
		attachments: [
			{
				content: pdfBuffer.toString("base64"),
				filename: "Reservation_Update.pdf",
				type: "application/pdf",
				disposition: "attachment",
			},
		],
	};

	try {
		await sgMail.send(FormSubmittionEmail);
	} catch (error) {
		console.error("Error sending email with PDF", error);
		// Handle error appropriately
	}
};

exports.updateReservation = async (req, res) => {
	const reservationId = req.params.reservationId;
	const updateData = req.body;

	// Assuming validation of reservationId and updateData is done beforehand

	Reservations.findByIdAndUpdate(reservationId, updateData, { new: true })
		.then(async (updatedReservation) => {
			if (!updatedReservation) {
				return res.status(404).json({ error: "Reservation not found" });
			}

			// Prepare and send the update email
			try {
				await sendEmailUpdate(updatedReservation, updateData.hotelName); // Make sure updatedReservation has the expected structure for your email template
				res.json({
					message: "Reservation updated and email sent successfully",
					reservation: updatedReservation,
				});
			} catch (error) {
				console.error("Error sending update email:", error);
				// Decide how you want to handle email errors - maybe just log or send a different response
				res.status(500).json({
					message: "Reservation updated, but failed to send email",
					error: error.toString(),
				});
			}
		})
		.catch((err) => {
			console.error("Error updating reservation:", err);
			res.status(500).json({ error: "Internal server error" });
		});
};

exports.deleteDataSource = async (req, res) => {
	try {
		// Extract the source from the request parameters
		const source = req.params.source;

		// Use the deleteMany function to remove all documents matching the source
		const deletionResult = await Reservations.deleteMany({
			booking_source: source,
		});

		// deletionResult.deletedCount will contain the number of documents removed
		res.status(200).json({
			message: `${deletionResult.deletedCount} documents were deleted successfully.`,
		});
	} catch (error) {
		// If an error occurs, log it and return a server error response
		console.error("Error in deleteDataSource:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

exports.summaryBySource = async () => {
	try {
		const summary = await Reservations.aggregate([
			{
				$group: {
					_id: "$booking_source", // Group by booking_source
					total_amount: { $sum: "$total_amount" }, // Sum of total_amount for each group
					reservation_count: { $sum: 1 }, // Count of reservations for each group
				},
			},
			{
				$project: {
					_id: 0, // Exclude _id from results
					booking_source: "$_id", // Rename _id to booking_source
					total_amount: 1, // Include total_amount
					reservation_count: 1, // Include reservation_count
				},
			},
		]);

		return summary;
	} catch (error) {
		console.error("Error in summaryBySource:", error);
		throw error;
	}
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
			res.status(200).json({ message: "Agoda Data imported successfully" });
		} else {
			res.status(200).json({ message: "No new data to import" });
		}
	} catch (error) {
		console.error("Error in agodaDataDump:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

const parseDate = (excelDate, country) => {
	// Check if excelDate is a number (Excel's serial date format)
	if (!isNaN(excelDate) && typeof excelDate === "number") {
		// Convert Excel's serial date to JavaScript Date
		const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
		// Adjust timezone offset
		const offset = date.getTimezoneOffset();
		const adjustedDate = new Date(date.getTime() - offset * 60 * 1000);
		return adjustedDate;
	} else {
		// Assume dateString is in the format of "mm/dd/yyyy" or "dd/mm/yyyy"
		const parts = String(excelDate).split("/");
		let day, month, year;
		if (country === "US") {
			[month, day, year] = parts.map((part) => parseInt(part, 10));
		} else {
			[day, month, year] = parts.map((part) => parseInt(part, 10));
		}
		return new Date(year, month - 1, day);
	}
};

exports.expediaDataDump = async (req, res) => {
	try {
		const accountId = req.params.accountId;
		const userId = req.params.belongsTo;
		const country = req.params.country;
		const filePath = req.file.path; // The path to the uploaded file
		const workbook = xlsx.readFile(filePath);
		const sheetName = workbook.SheetNames[0];
		const sheet = workbook.Sheets[sheetName];
		const data = xlsx.utils.sheet_to_json(sheet); // Convert the sheet data to JSON

		console.log(country, "country");
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
				// Pick the first item in the group to represent the common fields
				const firstItem = group[0];

				// Check if Check-in and Check-out dates are available
				if (!firstItem["Check-in"] || !firstItem["Check-out"]) {
					console.error(
						"Missing Check-in or Check-out date in row:",
						firstItem
					);
					return null; // Skip this record or handle it appropriately
				}

				// Calculate total price per room type per day
				const checkInDate = parseDate(firstItem["Check-in"], country);
				const checkOutDate = parseDate(firstItem["Check-out"], country);
				const daysOfResidence = calculateDaysOfResidence(
					checkInDate,
					checkOutDate
				);
				const pickedRoomsType = group.map((item) => ({
					room_type: item.Room,
					chosenPrice: item["Booking amount"] / daysOfResidence || 0,
					count: 1, // Assuming each record is for one room
				}));

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
					checkin_date: checkInDate,
					checkout_date: checkOutDate,
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
			res.status(200).json({ message: "Expedia Data imported successfully" });
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
			res
				.status(200)
				.json({ message: "Booking.com Data imported successfully" });
		} else {
			res.status(200).json({ message: "No new data to import" });
		}
	} catch (error) {
		console.error("Error in bookingDataDump:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

// Reports

exports.dateReport = async (req, res) => {
	const { date, hotelId, userMainId } = req.params;
	const startOfDay = new Date(`${date}T00:00:00Z`);
	const endOfDay = new Date(`${date}T23:59:59Z`);

	try {
		const reservations = await Reservations.find({
			belongsTo: mongoose.Types.ObjectId(userMainId),
			hotelId: mongoose.Types.ObjectId(hotelId),
			$or: [
				{
					$and: [
						{ booked_at: { $ne: null, $ne: "" } }, // Ensure booked_at is not null
						{ booked_at: { $gte: startOfDay, $lte: endOfDay } },
					],
				},
				{
					$and: [
						{ checkin_date: { $ne: null, $ne: "" } }, // Ensure checkin_date is not null
						{ checkin_date: { $gte: startOfDay, $lte: endOfDay } },
					],
				},
			],
		});

		return res.json(reservations);
	} catch (error) {
		console.error(error);
		return res
			.status(500)
			.json({ error: "Internal server error", details: error.message });
	}
};

exports.dayoverday = async (req, res) => {
	try {
		const { hotelId, userMainId } = req.params;

		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const past45Days = new Date(today);
		past45Days.setDate(past45Days.getDate() - 15);

		const matchCondition = {
			hotelId: ObjectId(hotelId),
			belongsTo: ObjectId(userMainId),
			booked_at: { $gte: past45Days, $lte: today },
		};

		const aggregation = await Reservations.aggregate([
			{ $match: matchCondition },
			{
				$addFields: {
					isCancelled: {
						$regexMatch: {
							input: "$reservation_status",
							regex: /cancelled/,
							options: "i",
						},
					},
					isInProgress: {
						$and: [
							{
								$not: [
									{
										$regexMatch: {
											input: "$reservation_status",
											regex: /cancelled|checkedout|checkout/,
											options: "i",
										},
									},
								],
							},
							{
								$or: [
									{ $eq: [{ $size: "$roomId" }, 0] },
									{ $eq: ["$roomId", null] },
								],
							},
						],
					},
				},
			},
			{
				$group: {
					_id: { $dateToString: { format: "%Y-%m-%d", date: "$booked_at" } },
					totalReservations: { $sum: 1 },
					totalAmount: { $sum: "$total_amount" },
					cancelledReservations: { $sum: { $cond: ["$isCancelled", 1, 0] } },
					cancelledAmount: {
						$sum: { $cond: ["$isCancelled", "$total_amount", 0] },
					},
					inProgressReservations: { $sum: { $cond: ["$isInProgress", 1, 0] } },
					inProgressAmount: {
						$sum: { $cond: ["$isInProgress", "$total_amount", 0] },
					},
				},
			},
			{ $sort: { _id: 1 } },
		]);

		res.json(aggregation);
	} catch (error) {
		res.status(500).send(error);
	}
};

exports.monthovermonth = async (req, res) => {
	try {
		const { hotelId, userMainId } = req.params;

		const matchCondition = {
			hotelId: ObjectId(hotelId),
			belongsTo: ObjectId(userMainId),
		};

		const aggregation = await Reservations.aggregate([
			{ $match: matchCondition },
			{
				$addFields: {
					monthYear: {
						$concat: [
							{
								$arrayElemAt: [
									[
										"January",
										"February",
										"March",
										"April",
										"May",
										"June",
										"July",
										"August",
										"September",
										"October",
										"November",
										"December",
									],
									{ $subtract: [{ $month: "$booked_at" }, 1] },
								],
							},
							", ",
							{ $toString: { $year: "$booked_at" } },
						],
					},
					isCancelled: {
						$regexMatch: {
							input: "$reservation_status",
							regex: /cancelled/,
							options: "i",
						},
					},
					isInProgress: {
						$and: [
							{
								$not: [
									{
										$regexMatch: {
											input: "$reservation_status",
											regex: /cancelled|checkedout|checkout/,
											options: "i",
										},
									},
								],
							},
							{
								$or: [
									{ $eq: [{ $size: "$roomId" }, 0] },
									{ $eq: ["$roomId", null] },
								],
							},
						],
					},
				},
			},
			{
				$group: {
					_id: "$monthYear",
					totalReservations: { $sum: 1 },
					totalAmount: { $sum: "$total_amount" },
					cancelledReservations: { $sum: { $cond: ["$isCancelled", 1, 0] } },
					cancelledAmount: {
						$sum: { $cond: ["$isCancelled", "$total_amount", 0] },
					},
					inProgressReservations: { $sum: { $cond: ["$isInProgress", 1, 0] } },
					inProgressAmount: {
						$sum: { $cond: ["$isInProgress", "$total_amount", 0] },
					},
				},
			},
			{ $sort: { _id: 1 } },
		]);

		res.json(aggregation);
	} catch (error) {
		res.status(500).send(error);
	}
};

exports.bookingSource = async (req, res) => {
	try {
		const { hotelId, userMainId } = req.params;

		const matchCondition = {
			hotelId: ObjectId(hotelId),
			belongsTo: ObjectId(userMainId),
		};

		const aggregation = await Reservations.aggregate([
			{ $match: matchCondition },
			{
				$addFields: {
					isCancelled: {
						$regexMatch: {
							input: "$reservation_status",
							regex: /cancelled/,
							options: "i",
						},
					},
					isInProgress: {
						$and: [
							{
								$not: [
									{
										$regexMatch: {
											input: "$reservation_status",
											regex: /cancelled|checkedout|checkout/,
											options: "i",
										},
									},
								],
							},
							{
								$or: [
									{ $eq: [{ $size: "$roomId" }, 0] },
									{ $eq: ["$roomId", null] },
								],
							},
						],
					},
				},
			},
			{
				$group: {
					_id: "$booking_source",
					totalReservations: { $sum: 1 },
					totalAmount: { $sum: "$total_amount" },
					cancelledReservations: { $sum: { $cond: ["$isCancelled", 1, 0] } },
					cancelledAmount: {
						$sum: { $cond: ["$isCancelled", "$total_amount", 0] },
					},
					inProgressReservations: { $sum: { $cond: ["$isInProgress", 1, 0] } },
					inProgressAmount: {
						$sum: { $cond: ["$isInProgress", "$total_amount", 0] },
					},
				},
			},
			{ $sort: { _id: 1 } },
		]);

		res.json(aggregation);
	} catch (error) {
		res.status(500).send(error);
	}
};

exports.reservationstatus = async (req, res) => {
	try {
		const { hotelId, userMainId } = req.params;

		const matchCondition = {
			hotelId: ObjectId(hotelId),
			belongsTo: ObjectId(userMainId),
		};

		const aggregation = await Reservations.aggregate([
			{ $match: matchCondition },
			{
				$addFields: {
					groupedStatus: {
						$switch: {
							branches: [
								{
									case: {
										$regexMatch: {
											input: "$reservation_status",
											regex: /cancelled/,
										},
									},
									then: "cancelled",
								},
								{
									case: { $in: ["$reservation_status", ["confirmed", "ok"]] },
									then: "confirmed",
								},
							],
							default: "$reservation_status",
						},
					},
				},
			},
			{
				$group: {
					_id: "$groupedStatus",
					totalReservations: { $sum: 1 },
					totalAmount: { $sum: "$total_amount" },
					cancelledAmount: {
						$sum: {
							$cond: [
								{ $eq: ["$groupedStatus", "cancelled"] },
								"$total_amount",
								0,
							],
						},
					},
					inProgressReservations: {
						$sum: {
							$cond: [
								{
									$or: [
										{ $eq: [{ $size: "$roomId" }, 0] },
										{ $eq: ["$roomId", null] },
									],
								},
								1,
								0,
							],
						},
					},
				},
			},
			{ $sort: { _id: 1 } },
		]);

		res.json(aggregation);
	} catch (error) {
		res.status(500).send(error);
	}
};
