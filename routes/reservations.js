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
	saveReservationsChannelManager,
	singleReservationHotelRunner,
	singleReservation,
	reservationSearchAllList,
	hotelRunnerPaginatedList,
	reservationsList,
	reservationsList2,
	updateReservation,
	agodaDataDump,
	expediaDataDump,
	bookingDataDump,
} = require("../controllers/reservations");

router.post(
	"/reservations/create/:userId",
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

router.get("/reservations/search/:searchQuery", reservationSearchAllList);
router.get("/reservations/search/:searchQuery", reservationSearch);

router.get(
	"/reservations/save/hotel-runner/:page/:hotelId/:belongsTo",
	saveReservationsChannelManager
);

router.get(
	"/reservations/remove-duplicates",
	removeDuplicates_ConfirmationNumber
);

router.get(
	"/reservations/single-reservation/hotel-runner/:reservationNumber",
	singleReservationHotelRunner
);

router.get(
	"/reservations/single-reservation/:reservationNumber/:hotelId/:belongsTo",
	singleReservation
);

router.get(
	"/reservations/list/paginated/:page/:per_page",
	hotelRunnerPaginatedList
);

router.get("/reservations/:startdate/:enddate/:accountId", reservationsList);

router.post(
	"/reservations/agoda-data-dump/:accountId",
	upload.single("file"),
	agodaDataDump
);
router.post(
	"/reservations/expedia-data-dump/:accountId",
	upload.single("file"),
	expediaDataDump
);
router.post(
	"/reservations/booking-data-dump/:accountId",
	upload.single("file"),
	bookingDataDump
);

router.get("/reservations2/:accountId", reservationsList2);
router.put("/reservation-update/:reservationId", updateReservation);

router.param("userId", userById);
router.param("reservationId", reservationById);

module.exports = router;
