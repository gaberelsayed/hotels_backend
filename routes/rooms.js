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
	roomById,
	read,
	update,
	list,
	listForAdmin,
} = require("../controllers/rooms");

router.get("/room-single/:roomId", read);

router.post(
	"/room/create/:userId",
	requireSignin,
	isAuth,
	isHotelOwner,
	create
);

router.put(
	"/room/:roomId/:userId",
	requireSignin,
	isAuth,
	isHotelOwner,
	update
);

router.get("/room/:accountId", list);
router.get("/room-admin", isAuth, isAdmin, listForAdmin);

router.param("userId", userById);
router.param("roomId", roomById);

module.exports = router;
