/** @format */

const express = require("express");
const router = express.Router();

const { userById } = require("../controllers/user");
const {
	createUpdateDocument,
	list,
	listOfAllActiveHotels,
	distinctRoomTypes,
} = require("../controllers/janat");

router.post("/janat-website/:documentId", createUpdateDocument);
router.get("/janat-website-document", list);
router.get("/active-hotels", listOfAllActiveHotels);
router.get("/distinct-rooms", distinctRoomTypes);

router.param("userId", userById);

module.exports = router;
