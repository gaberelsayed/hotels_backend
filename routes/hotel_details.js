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
	hotelDetailsById,
	read,
	list,
	listForAdmin,
	updateHotelDetails,
} = require("../controllers/hotel_details");

router.get("/hotel-details-single/:hotelDetailsId", read);

router.post(
	"/hotel-details/create/:userId",
	requireSignin,
	isAuth,
	isHotelOwner,
	create
);

router.get("/hotel-details/:accountId", list);
router.get("/hotel-details-admin/:userId", isAdmin, listForAdmin);
router.put(
	"/hotel-details-update/:hotelId/:userId",
	requireSignin,
	isAuth,
	isHotelOwner,
	updateHotelDetails
);

router.param("userId", userById);
router.param("hotelDetailsId", hotelDetailsById);

module.exports = router;
