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
	listOfHotelUser,
} = require("../controllers/hotel_details");

router.get("/hotel-details/:hotelDetailsId", read); // Consolidated into a single route

router.post(
	"/hotel-details/create/:userId",
	requireSignin,
	isAuth,
	isHotelOwner,
	create
);

router.get("/hotel-details/account/:accountId", list); // Adjusted for clarity
router.get("/hotel-details/super-admin/:accountId", listOfHotelUser);
router.get(
	"/hotel-details/admin/:userId",
	requireSignin,
	isAdmin,
	listForAdmin
);

router.put(
	"/hotel-details/update/:hotelId/:userId",
	requireSignin,
	isAuth,
	isHotelOwner,
	updateHotelDetails
);

router.param("userId", userById);
router.param("hotelDetailsId", hotelDetailsById);

module.exports = router;
