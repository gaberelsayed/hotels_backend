/** @format */

const express = require("express");
const router = express.Router();

const { userById } = require("../controllers/user");
const {
	createUpdateDocument,
	list,
	listOfAllActiveHotels,
	distinctRoomTypes,
	getHotelFromSlug,
	getListOfHotels,
	gettingRoomListFromQuery,
} = require("../controllers/janat");

router.post("/janat-website/:documentId", createUpdateDocument);
router.get("/janat-website-document", list);
router.get("/active-hotels", listOfAllActiveHotels);
router.get("/single-hotel/:hotelSlug", getHotelFromSlug);
router.get("/active-hotel-list", getListOfHotels);
router.get("/distinct-rooms", distinctRoomTypes);
router.get("/room-query-list/:query", gettingRoomListFromQuery);

router.param("userId", userById);

module.exports = router;
