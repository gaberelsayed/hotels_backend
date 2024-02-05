const Reservations = require("../models/reservations");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const fetch = require("node-fetch");
const Rooms = require("../models/rooms");
const xlsx = require("xlsx");
const sgMail = require("@sendgrid/mail");
const puppeteer = require("puppeteer");
const moment = require("moment-timezone");
const {
	confirmationEmail,
	reservationUpdate,
	emailPaymentLink,
} = require("./assets");

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
		to: reservationData.customer_details.email
			? reservationData.customer_details.email
			: "ahmedabdelrazak20@gmail.com",
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
		console.error(
			"Error sending email with PDF error.response.boyd",
			error.response.body
		);
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

exports.sendPaymentLinkEmail = async (req, res) => {
	const { paymentLink, customerEmail } = req.body; // Assuming the payment link and customer's email are sent in the request body

	if (!paymentLink || !customerEmail) {
		return res
			.status(400)
			.json({ error: "Missing payment link or customer email" });
	}

	const emailContent = emailPaymentLink(paymentLink); // Generate the email content with the payment link

	const email = {
		to: customerEmail, // The customer's email address
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
		], // Your verified sender
		subject: "Reservation Payment Link",
		html: emailContent, // Use the generated HTML content
	};

	try {
		await sgMail.send(email);
		res.json({ message: "Payment link email sent successfully" });
	} catch (error) {
		console.error("Error sending payment link email:", error);
		res.status(500).json({ error: "Failed to send payment link email" });
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
				{ booking_source: searchPattern },
			],
		};

		// Fetch all matching documents
		const reservations = await Reservations.find(query).populate("belongsTo");

		if (reservations.length === 0) {
			return res.status(404).json({
				error: "No reservations found matching the search criteria.",
			});
		}

		res.json(reservations);
	} catch (error) {
		console.error("Error in reservationSearchAllList:", error);
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

exports.singleReservationById = (req, res) => {
	const reservationId = req.params.reservationId;

	// Find a single reservation by its ID
	Reservations.findById(reservationId)
		.populate("hotelId")
		.populate("belongsTo")
		.then((reservation) => {
			if (!reservation) {
				return res.status(404).send({
					message: "Reservation not found with id " + reservationId,
				});
			}
			res.send(reservation);
		})
		.catch((err) => {
			if (err.kind === "ObjectId") {
				return res.status(404).send({
					message: "Reservation not found with id " + reservationId,
				});
			}
			return res.status(500).send({
				message: "Error retrieving reservation with id " + reservationId,
			});
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
		to: reservationData.customer_details.email
			? reservationData.customer_details.email
			: "ahmedabdelrazak20@gmail.com",
		from: "noreply@janatbooking.com",
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

	console.log(updateData.total_amount, "total_amount");
	console.log(
		updateData.calculateTotalAmountWithRooms,
		"calculateTotalAmountWithRooms"
	);
	console.log(updateData.days_of_residence, "days_of_residence");

	// Assuming validation of reservationId and updateData is done beforehand

	Reservations.findByIdAndUpdate(reservationId, updateData, { new: true })
		.then(async (updatedReservation) => {
			if (!updatedReservation) {
				return res.status(404).json({ error: "Reservation not found" });
			}

			// Prepare and send the update email
			try {
				if (req.body.sendEmail) {
					await sendEmailUpdate(updatedReservation, updateData.hotelName); // Make sure updatedReservation has the expected structure for your email template
				}
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
//{hotelId: ObjectId('65b640a1f33023933c22eba3')}
exports.deleteByHotelId = async (req, res) => {
	try {
		// Extract the source from the request parameters
		const hotelId = mongoose.Types.ObjectId(req.params.hotelId);

		// Use the deleteMany function to remove all documents matching the source
		const deletionResult = await Reservations.deleteMany({
			hotelId: hotelId,
		});

		// deletionResult.deletedCount will contain the number of documents removed
		res.status(200).json({
			message: `${deletionResult.deletedCount} documents were deleted successfully.`,
		});
	} catch (error) {
		// If an error occurs, log it and return a server error response
		console.error("Error in deleteByHotelId:", error);
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
const calculateDaysOfResidence = (checkIn, checkOut) => {
	const checkInDate = new Date(new Date(checkIn).setHours(0, 0, 0, 0));
	const checkOutDate = new Date(new Date(checkOut).setHours(0, 0, 0, 0));

	if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
		return 0; // Return 0 if dates are invalid
	}

	const diffInTime = checkOutDate.getTime() - checkInDate.getTime();
	const diffInDays = diffInTime / (1000 * 3600 * 24);
	return diffInDays; // Return the difference in days
};

exports.agodaDataDump = async (req, res) => {
	try {
		const accountId = req.params.accountId;
		const userId = req.params.belongsTo;

		const filePath = req.file.path; // The path to the uploaded file
		const workbook = xlsx.readFile(filePath);
		const sheetName = workbook.SheetNames[0];
		const sheet = workbook.Sheets[sheetName];
		const data = xlsx.utils.sheet_to_json(sheet); // Convert the sheet data to JSON

		for (const item of data) {
			const itemNumber = item["BookingIDExternal_reference_ID"]
				?.toString()
				.trim();
			if (!itemNumber) continue; // Skip if there's no book number

			// Calculate totalAmount by checking if ReferenceSellInclusive is provided and not zero
			let totalAmount;
			if (Number(item.ReferenceSellInclusive) > 0) {
				totalAmount = Number(item.ReferenceSellInclusive);
			} else {
				// If ReferenceSellInclusive is 0, undefined, or not a number, add Total_inclusive_rate and Commission
				totalAmount =
					Number(item.Total_inclusive_rate || 0) + Number(item.Commission || 0);
			}

			const daysOfResidence = calculateDaysOfResidence(
				item.StayDateFrom,
				item.StayDateTo
			);

			// Assuming each record is for one room, adjust accordingly if you have more details
			const pickedRoomsType = [
				{
					room_type: item.RoomType,
					chosenPrice: (daysOfResidence > 0
						? totalAmount / daysOfResidence
						: 0
					).toFixed(2),
					count: 1,
				},
			];

			// Parse the date using moment, and convert it to the Saudi Arabia timezone
			const bookedAtSaudi = moment.tz(item.BookedDate, "Asia/Riyadh").toDate();
			const checkInDateSaudi = moment
				.tz(item.StayDateFrom, "Asia/Riyadh")
				.toDate();
			const checkOutDateSaudi = moment
				.tz(item.StayDateTo, "Asia/Riyadh")
				.toDate();

			// Prepare the document based on your mapping, including any necessary calculations
			const document = {
				confirmation_number: item.BookingIDExternal_reference_ID,
				booking_source: "agoda",
				customer_details: {
					name: item.Customer_Name, // Concatenated first name and last name if available
					nationality: item.Customer_Nationality,
					phone: item.Customer_Phone || "",
					email: item.Customer_Email || "",
				},
				state: "confirmed",
				reservation_status: item.Status.toLowerCase().includes("cancelled")
					? "cancelled"
					: item.Status.toLowerCase().includes("show")
					? "no_show"
					: item.Status,
				total_guests: item.No_of_adult + (item.No_of_children || 0),
				cancel_reason: item.CancellationPolicyDescription || "",
				booked_at: bookedAtSaudi,
				sub_total: item.Total_inclusive_rate,
				total_rooms: 1,
				total_amount: totalAmount.toFixed(2),
				currency: item.Currency,
				checkin_date: checkInDateSaudi,
				checkout_date: checkOutDateSaudi,
				days_of_residence: daysOfResidence,
				comment: item.Special_Request || "",
				commision: item.Commission, // Note the misspelling of 'commission' here
				payment: item.PaymentModel.toLowerCase(),
				pickedRoomsType,
				hotelId: accountId,
				belongsTo: userId,
			};

			const existingReservation = await Reservations.findOne({
				confirmation_number: itemNumber,
				booking_source: "agoda",
				hotelId: accountId,
			});

			if (existingReservation) {
				await Reservations.updateOne(
					{ confirmation_number: itemNumber },
					{
						$set: {
							...document,
							reservation_status:
								document.reservation_status === "cancelled"
									? "cancelled"
									: document.reservation_status === "no_show"
									? "no_show"
									: existingReservation.reservation_status,
						},
					}
				);
			} else {
				try {
					await Reservations.create(document);
				} catch (error) {
					if (error.code === 11000) {
						// Check for duplicate key error
						// console.log(
						// 	`Skipping duplicate document for confirmation_number: ${itemNumber}`
						// );
						continue; // Skip to the next item
					} else {
						throw error; // Rethrow if it's not a duplicate key error
					}
				}
			}
		}

		res.status(200).json({
			message: "Data has been updated and uploaded successfully.",
		});
	} catch (error) {
		console.error("Error in agodaDataDump:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

const parseDate = (dateInput, country) => {
	// Check if dateInput is an Excel serial date number
	if (typeof dateInput === "number") {
		const excelEpoch = new Date(1899, 11, 30); // Excel's base date (December 30, 1899)
		const parsedDate = new Date(excelEpoch.getTime() + dateInput * 86400000);
		const offset = parsedDate.getTimezoneOffset();
		return new Date(parsedDate.getTime() - offset * 60000);
	}
	// Check for ISO 8601 date string
	else if (typeof dateInput === "string" && dateInput.includes("T")) {
		return new Date(dateInput);
	}
	// Assume dateInput is a "dd/mm/yyyy" or "mm/dd/yyyy" format string
	else if (typeof dateInput === "string") {
		const parts = dateInput.split("/");
		let day, month, year;
		if (country === "US") {
			[month, day, year] = parts.map(Number);
		} else {
			[day, month, year] = parts.map(Number);
		}
		return new Date(year, month - 1, day);
	}
	return null; // Return null if none of the above conditions are met
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

		const calculateDaysOfResidence = (checkIn, checkOut) => {
			const checkInDate = new Date(checkIn);
			const checkOutDate = new Date(checkOut);

			// Validate if both dates are valid
			if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
				return 0; // Return a default value (e.g., 0) if dates are invalid
			}

			return (checkOutDate - checkInDate) / (1000 * 3600 * 24); // Calculating difference in days
		};

		for (const item of data) {
			const itemNumber = item["Reservation ID"]?.toString().trim();
			if (!itemNumber) continue; // Skip if there's no book number

			const daysOfResidence = calculateDaysOfResidence(
				item["check-in"],
				item["check-out"]
			);

			const pickedRoomsType = [
				{
					room_type: item["Room"],
					chosenPrice:
						Number(item["Booking amount"] / daysOfResidence).toFixed(2) || 0,
					count: 1, // Assuming each record is for one room. Adjust accordingly if you have more details.
				},
			];

			// Use the parseDate function for date fields
			const bookedAt = parseDate(item["Booked"]);
			const checkInDate = parseDate(item["Check-in"], country);
			const checkOutDate = parseDate(item["Check-out"], country);

			// console.log(item, "item");

			// Check for valid dates before proceeding
			if (!bookedAt || !checkInDate || !checkOutDate) {
				console.error(`Invalid date found in record: ${JSON.stringify(item)}`);
				continue; // Skip this item if dates are invalid
			}

			// Prepare the document based on your mapping, including any necessary calculations
			const document = {
				confirmation_number: item["Reservation ID"] || item["Confirmation #"],
				booking_source: "expedia",
				customer_details: {
					name: item.Guest || "", // Assuming 'Guest' contains the full name
				},
				state: "confirmed",
				reservation_status: item.Status.toLowerCase().includes("cancelled")
					? "cancelled"
					: item.Status.toLowerCase().includes("show")
					? "no_show"
					: item.Status,
				total_guests: item.total_guests || 1, // Total number of guests
				total_rooms: item["rooms"], // The number of items in the group
				booked_at: bookedAt,
				checkin_date: checkInDate,
				checkout_date: checkOutDate,
				sub_total: item["Booking amount"],
				total_amount: item["Booking amount"],
				currency: "SAR", // Adjust as needed
				days_of_residence: daysOfResidence,
				comment: item["Special Request"] || "",
				booking_comment: item["Special Request"] || "", // Replace with the actual column name if different
				payment: item["Payment type"].toLowerCase(),
				pickedRoomsType,
				commision: item.Commission, // Ensure this field exists in your schema
				hotelId: accountId,
				belongsTo: userId,
			};

			const existingReservation = await Reservations.findOne({
				confirmation_number: itemNumber,
				booking_source: "expedia",
				hotelId: accountId,
			});

			if (existingReservation) {
				await Reservations.updateOne(
					{ confirmation_number: itemNumber },
					{
						$set: {
							...document,
							reservation_status:
								document.reservation_status === "cancelled"
									? "cancelled"
									: document.reservation_status === "no_show"
									? "no_show"
									: existingReservation.reservation_status,
						},
					}
				);
			} else {
				try {
					await Reservations.create(document);
				} catch (error) {
					if (error.code === 11000) {
						// Check for duplicate key error
						// console.log(
						// 	`Skipping duplicate document for confirmation_number: ${itemNumber}`
						// );
						continue; // Skip to the next item
					} else {
						throw error; // Rethrow if it's not a duplicate key error
					}
				}
			}
		}
		res.status(200).json({
			message: "Data has been updated and uploaded successfully.",
		});
	} catch (error) {
		console.error("Error in expediaDataDump:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

exports.airbnb = async (req, res) => {
	try {
		const accountId = req.params.accountId;
		const userId = req.params.belongsTo;
		const country = req.params.country;
		const filePath = req.file.path; // The path to the uploaded file
		const workbook = xlsx.readFile(filePath);
		const sheetName = workbook.SheetNames[0];
		const sheet = workbook.Sheets[sheetName];
		const data = xlsx.utils.sheet_to_json(sheet); // Convert the sheet data to JSON

		const calculateDaysOfResidence = (checkIn, checkOut) => {
			const checkInDate = new Date(checkIn);
			const checkOutDate = new Date(checkOut);

			// Validate if both dates are valid
			if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
				return 0; // Return a default value (e.g., 0) if dates are invalid
			}

			return (checkOutDate - checkInDate) / (1000 * 3600 * 24); // Calculating difference in days
		};

		const parseEarnings = (earningsString) => {
			// This regular expression matches optional currency symbols and extracts digits and decimal points
			const matches = earningsString.match(/[\d\.]+/);
			if (matches) {
				return parseFloat(matches[0]);
			} else {
				return 0; // Return 0 if no matching numeric part is found
			}
		};

		for (const item of data) {
			const itemNumber = item["Confirmation code"]?.toString().trim();
			if (!itemNumber) continue; // Skip if there's no book number

			let roomType = ""; // Determine roomType based on `item` details
			const peoplePerRoom =
				item["# of adults"] + item["# of children"] + item["# of infants"];
			// Example logic to determine roomType
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
			} // Add more conditions as per your logic

			const pickedRoomsType = [
				{
					room_type: roomType,
					chosenPrice:
						Number(item["Booking amount"] / item["# of nights"]).toFixed(2) ||
						0,
					count: 1, // Assuming each record is for one room. Adjust accordingly if you have more details.
				},
			];

			// Use the parseDate function for date fields
			const bookedAt = parseDate(item["Booked"]);
			const checkInDate = parseDate(item["Start date"], country);
			const checkOutDate = parseDate(item["End date"], country);

			// console.log(item, "item");

			// Check for valid dates before proceeding
			if (!bookedAt || !checkInDate || !checkOutDate) {
				console.error(`Invalid date found in record: ${JSON.stringify(item)}`);
				continue; // Skip this item if dates are invalid
			}

			// Prepare the document based on your mapping, including any necessary calculations
			const document = {
				confirmation_number: item["Confirmation code"],
				booking_source: "airbnb",
				customer_details: {
					name: item["Guest name"] || "", // Assuming 'Guest' contains the full name
					phone: item["Contact"] || "", // Assuming 'Guest' contains the full name
				},
				state: "confirmed",
				reservation_status:
					item.Status.toLowerCase().includes("cancelled") ||
					item.Status.toLowerCase().includes("canceled")
						? "cancelled"
						: item.Status.toLowerCase().includes("show")
						? "no_show"
						: item.Status,
				total_guests:
					item["# of adults"] + item["# of children"] + item["# of infants"] ||
					1, // Total number of guests
				total_rooms: 1, // The number of items in the group
				booked_at: bookedAt,
				checkin_date: checkInDate,
				checkout_date: checkOutDate,
				sub_total: parseEarnings(item.Earnings),
				total_amount: parseEarnings(item.Earnings),
				currency: "SAR", // Adjust as needed
				days_of_residence: item["# of nights"] + 1,
				comment: item["Listing"] || "",
				booking_comment: item["Listing"] || "", // Replace with the actual column name if different
				payment: item["Payment type"],
				pickedRoomsType,
				commision: item.Commission ? item.Commission : 0, // Ensure this field exists in your schema
				hotelId: accountId,
				belongsTo: userId,
			};

			const existingReservation = await Reservations.findOne({
				confirmation_number: itemNumber,
				booking_source: "airbnb",
				hotelId: accountId,
			});

			if (existingReservation) {
				await Reservations.updateOne(
					{ confirmation_number: itemNumber },
					{
						$set: {
							...document,
							reservation_status:
								document.reservation_status === "cancelled"
									? "cancelled"
									: document.reservation_status === "no_show"
									? "no_show"
									: existingReservation.reservation_status,
						},
					}
				);
			} else {
				try {
					await Reservations.create(document);
				} catch (error) {
					if (error.code === 11000) {
						// Check for duplicate key error
						// console.log(
						// 	`Skipping duplicate document for confirmation_number: ${itemNumber}`
						// );
						continue; // Skip to the next item
					} else {
						throw error; // Rethrow if it's not a duplicate key error
					}
				}
			}
		}
		res.status(200).json({
			message: "Data has been updated and uploaded successfully.",
		});
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

		const calculateDaysOfResidence = (checkIn, checkOut) => {
			const checkInDate = new Date(new Date(checkIn).setHours(0, 0, 0, 0));
			const checkOutDate = new Date(new Date(checkOut).setHours(0, 0, 0, 0));

			if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
				return 0; // Return 0 if dates are invalid
			}

			const diffInTime = checkOutDate.getTime() - checkInDate.getTime();
			const diffInDays = diffInTime / (1000 * 3600 * 24);
			return diffInDays; // Return the difference in days
		};

		const parseDate = (dateString) => {
			const date = new Date(dateString);
			return isNaN(date.getTime()) ? null : date;
		};

		const parsePrice = (priceString) => {
			// Check if the priceString is not undefined and is a string
			if (typeof priceString === "string" || priceString instanceof String) {
				return parseFloat(priceString.replace(/[^\d.-]/g, ""));
			}
			return 0; // Return 0 or some default value if the priceString is not a valid string
		};

		const parseDateToSaudiTimezone = (dateString) => {
			// Parse the date using moment and convert it to the Asia/Riyadh timezone
			return moment.tz(dateString, "Asia/Riyadh").format();
		};

		for (const item of data) {
			const itemNumber = item["book number"]?.toString().trim();
			if (!itemNumber) continue; // Skip if there's no book number

			const daysOfResidence = calculateDaysOfResidence(
				item["check-in"],
				item["check-out"]
			);

			const price =
				(Number(parsePrice(item.price)) +
					Number(parsePrice(item.price)) * 0.1 +
					Number(parsePrice(item["commission amount"]))) /
				Number(item["rooms"]);

			const chosenPrice =
				daysOfResidence > 0 ? Number(price / daysOfResidence).toFixed(2) : 0;

			const peoplePerRoom = item.persons
				? item.persons
				: item.people / item.rooms;
			// Assuming item['rooms'] gives the number of rooms or you have a way to determine roomType from `item`
			let roomType = ""; // Determine roomType based on `item` details
			// Example logic to determine roomType
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
			} // Add more conditions as per your logic

			// Initialize the pickedRoomsType array
			const pickedRoomsType = [];

			// Populate the pickedRoomsType array based on the room count
			for (let i = 0; i < Number(item["rooms"]); i++) {
				pickedRoomsType.push({
					room_type: roomType,
					chosenPrice: chosenPrice,
					count: 1, // Each object represents 1 room
				});
			}

			// ... Inside your transform logic
			const totalAmount = Number(parsePrice(item.price || 0)).toFixed(2); // Provide a default string if Price is undefined

			const commission = parsePrice(item["commission amount"] || 0); // Provide a default string if Commission Amount is undefined

			// Use the parseDate function for date fields
			const bookedAt = parseDateToSaudiTimezone(item["booked on"]);
			const checkInDate = parseDateToSaudiTimezone(item["check-in"]);
			const checkOutDate = parseDateToSaudiTimezone(item["check-out"]);

			// Check for valid dates before proceeding
			if (!bookedAt || !checkInDate || !checkOutDate) {
				console.error(`Invalid date found in record: ${JSON.stringify(item)}`);
				continue; // Skip this item if dates are invalid
			}

			// Prepare the document based on your mapping, including any necessary calculations
			const document = {
				confirmation_number: item["book number"] || "",
				booking_source: "booking.com",
				customer_details: {
					name: item["guest name(s)"] || "", // Assuming 'Guest Name(s)' contains the full name
				},
				state: "confirmed",
				reservation_status: item.status.toLowerCase().includes("cancelled")
					? "cancelled"
					: item.status.toLowerCase().includes("show")
					? "no_show"
					: item.status,
				total_guests: item.people || 1, // Total number of guests
				total_rooms: item["rooms"], // The number of items in the group
				booked_at: bookedAt,
				checkin_date: checkInDate,
				checkout_date: checkOutDate,
				sub_total: totalAmount,
				total_amount:
					Number(totalAmount) + Number(commission) + Number(totalAmount) * 0.1,
				currency: "SAR", // Adjust as needed
				days_of_residence: daysOfResidence,
				comment: item.remarks || "",
				booking_comment: item.remarks || "",
				payment: item["payment status"] ? item["payment status"] : "Not Paid",
				pickedRoomsType,
				commission: commission, // Ensure this field exists in your schema
				hotelId: accountId,
				belongsTo: userId,
			};

			const existingReservation = await Reservations.findOne({
				confirmation_number: itemNumber,
				booking_source: "booking.com",
				hotelId: accountId,
			});

			if (existingReservation) {
				await Reservations.updateOne(
					{ confirmation_number: itemNumber },
					{
						$set: {
							...document,
							reservation_status:
								document.reservation_status === "cancelled"
									? "cancelled"
									: document.reservation_status === "no_show"
									? "no_show"
									: existingReservation.reservation_status,
						},
					}
				);
			} else {
				try {
					await Reservations.create(document);
				} catch (error) {
					if (error.code === 11000) {
						// Check for duplicate key error
						// console.log(
						// 	`Skipping duplicate document for confirmation_number: ${itemNumber}`
						// );
						continue; // Skip to the next item
					} else {
						throw error; // Rethrow if it's not a duplicate key error
					}
				}
			}
		}

		res.status(200).json({
			message: "Data has been updated and uploaded successfully.",
		});
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
