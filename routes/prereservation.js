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
	preReservationById,
	read,
	update,
	list,
	listForAdmin,
	list2,
	reservationSearch,
	updatePreReservationStatus,
	getListPreReservation,
	totalRecordsPreReservation,
	reservationSearchAllMatches,
	removeDuplicates_ConfirmationNumber,
} = require("../controllers/prereservation");

router.get("/pre-reservation-single/:prereservationId", read);

router.post(
	"/pre-reservation/create/:userId",
	requireSignin,
	isAuth,
	isHotelOwner,
	create
);

router.put(
	"/pre-reservation/:prereservationId/:userId",
	requireSignin,
	isAuth,
	isHotelOwner,
	update
);

router.get("/pre-reservation/:accountId", list);
router.get("/remove-duplicates", removeDuplicates_ConfirmationNumber);
router.get("/pre-reservation2/:accountId", list2);
router.get("/search/:searchQuery", reservationSearch);
router.get("/search-all-matches/:searchQuery", reservationSearchAllMatches);
router.put("/update/:neededId", updatePreReservationStatus);
router.get("/pre-reservation-admin", isAuth, isAdmin, listForAdmin);
router.get("/get-total-records/:hotelId", totalRecordsPreReservation);
router.get(
	"/list-prereservation/:page/:records/:filters/:hotelId",
	getListPreReservation
);

router.param("userId", userById);
router.param("prereservationId", preReservationById);

module.exports = router;
