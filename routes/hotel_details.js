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
	update,
	list,
	remove,
	listForAdmin,
} = require("../controllers/hotel_details");

router.get("/hotel-details-single/:hotelDetailsId", read);

router.post(
	"/hotel-details/create/:userId",
	requireSignin,
	isAuth,
	isHotelOwner,
	create
);

router.put(
	"/hotel-details/:hotelDetailsId/:userId",
	requireSignin,
	isAuth,
	isHotelOwner,
	update
);

router.get("/hotel-details/:accountId", list);
router.get("/hotel-details-admin/:userId", isAdmin, listForAdmin);

router.param("userId", userById);
router.param("hotelDetailsId", hotelDetailsById);

module.exports = router;
