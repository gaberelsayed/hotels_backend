/** @format */

const express = require("express");
const router = express.Router();

const {
	create,
	list,
	totalDocumentCount,
	updateHouseKeepingTask,
	listOfTasksForEmployee,
} = require("../controllers/housekeeping");

router.post("/house-keeping/create/:hotelId", create);

router.get("/house-keeping-list/:page/:records/:hotelId", list);
router.get("/house-keeping-total-records/:hotelId", totalDocumentCount);
router.put("/house-keeping-update-document/:taskId", updateHouseKeepingTask);
router.get("/house-keeping-employee/:userId", listOfTasksForEmployee);

module.exports = router;
