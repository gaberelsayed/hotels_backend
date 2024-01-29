/** @format */

const express = require("express");
const router = express.Router();
const { requireSignin, isAuth, isHotelOwner } = require("../controllers/auth");
const { userById } = require("../controllers/user");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const {
	create,
	reservationById,
	removeDuplicates_ConfirmationNumber,
	reservationSearch,
	getListOfReservations,
	totalRecordsReservations,
	singleReservation,
	reservationSearchAllList,
	reservationsList,
	reservationsList2,
	updateReservation,
	agodaDataDump,
	expediaDataDump,
	bookingDataDump,
} = require("../controllers/reservations");

router.post(
	"/reservations/create/:userId/:hotelId",
	requireSignin,
	isAuth,
	isHotelOwner,
	create
);

router.get(
	"/reservations/list/:page/:records/:filters/:hotelId/:date",
	getListOfReservations
);

router.get(
	"/reservations/get-total-records/:hotelId",
	totalRecordsReservations
);

router.get(
	"/reservations/search/all-list/:searchQuery/:accountId",
	reservationSearchAllList
);
router.get("/reservations/search/:searchQuery/:accountId", reservationSearch);

router.get(
	"/reservations/remove-duplicates",
	removeDuplicates_ConfirmationNumber
);

router.get(
	"/reservations/single-reservation/:reservationNumber/:hotelId/:belongsTo",
	singleReservation
);

router.get(
	"/reservations/:startdate/:enddate/:belongsTo/:accountId/",
	reservationsList
);

router.post(
	"/reservations/agoda-data-dump/:accountId/:belongsTo",
	upload.single("file"),
	agodaDataDump
);
router.post(
	"/reservations/expedia-data-dump/:accountId/:belongsTo",
	upload.single("file"),
	expediaDataDump
);
router.post(
	"/reservations/booking-data-dump/:accountId/:belongsTo",
	upload.single("file"),
	bookingDataDump
);

router.get("/reservations2/:accountId", reservationsList2);
router.put("/reservation-update/:reservationId", updateReservation);

router.param("userId", userById);
router.param("reservationId", reservationById);

module.exports = router;
