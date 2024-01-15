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
router.get("/pre-reservation2/:accountId", list2);
router.get("/search/:searchQuery", reservationSearch);
router.put("/update/:neededId", updatePreReservationStatus);
router.get("/pre-reservation-admin", isAuth, isAdmin, listForAdmin);
router.get("/list-prereservation", getListPreReservation);

router.param("userId", userById);
router.param("prereservationId", preReservationById);

module.exports = router;
