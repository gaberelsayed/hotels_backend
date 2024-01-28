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
	listOfRoomsSummary,
	hotelRunnerRoomList,
	updateRoomInventory,
	getDistinctRoomTypes,
	getDistinctRoomTypesFromReservations,
	getDistinctHotelRunnerRooms,
	reservedRoomsSummary,
	removeDuplicates,
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

router.get("/room/:accountId/:mainUserId", list);
router.get("/distinct", getDistinctRoomTypes);
router.get("/distinct-hotel-runner", getDistinctHotelRunnerRooms);
router.get(
	"/reservations-distinct-rooms",
	getDistinctRoomTypesFromReservations
);
router.get("/room-list", hotelRunnerRoomList);
router.delete("/room/delete", removeDuplicates);

router.get("/room/:checkin/:checkout/:accoundId", listOfRoomsSummary);
router.get("/room-admin", isAuth, isAdmin, listForAdmin);
router.put("/room-inventory-update", updateRoomInventory);
router.get(
	"/room-inventory-reserved/:startdate/:enddate/:accountId",
	reservedRoomsSummary
);

router.param("userId", userById);
router.param("roomId", roomById);

module.exports = router;
