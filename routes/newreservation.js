/** @format */

const express = require("express");
const router = express.Router();
const {
	requireSignin,
	isAuth,
	isHotelOwner,
	isAdmin,
} = require("../controllers/auth");
const { userById } = require("../controllers/user");

const {
	create,
	newReservationById,
	read,
	update,
	list,
	listForAdmin,
	list2,
	listOfAllReservationSummary,
	listOfAllReservationSummaryBasic,
	singleReservationHotelRunner,
	hotelRunnerPaginatedList,
} = require("../controllers/newreservation");

router.get("/new-reservation-single/:newreservationId", read);

router.post(
	"/new-reservation/create/:userId",
	requireSignin,
	isAuth,
	isHotelOwner,
	create
);

router.put(
	"/new-reservation/:newreservationId/:userId",
	requireSignin,
	isAuth,
	isHotelOwner,
	update
);

router.get("/new-reservation/:accountId", list);
router.get(
	"/single-reservation/hotel-runner/:reservationNumber",
	singleReservationHotelRunner
);
router.get(
	"/single-prereservation/:reservationNumber/:hotelId/:belongsTo",
	listOfAllReservationSummaryBasic
);
router.get("/new-reservation2/:accountId", list2);
router.get(
	"/reservation/list/paginated/:page/:per_page",
	hotelRunnerPaginatedList
);
router.get("/new-reservation-admin", isAuth, isAdmin, listForAdmin);
router.get(
	"/reservations-from-platforms/:hotelId/:belongsTo",
	listOfAllReservationSummary
);

router.param("userId", userById);
router.param("newreservationId", newReservationById);

module.exports = router;
