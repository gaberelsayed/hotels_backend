/** @format */

const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const houseKeepingSchema = new mongoose.Schema(
	{
		taskDate: {
			type: Date,
			default: new Date(),
		},

		confirmation_number: {
			type: String,
			default: "manual task",
			lowercase: true,
		},

		task_status: {
			type: String,
			default: "Unfinished",
			lowercase: true,
		},

		cleaningDate: {
			type: Date,
			default: new Date(),
		},

		task_comment: {
			type: String,
			default: "",
			lowercase: true,
		},

		assignedTo: { type: ObjectId, ref: "User", default: null },
		cleanedBy: { type: ObjectId, ref: "User", default: null },
		rooms: [{ type: ObjectId, ref: "Rooms" }],
		hotelId: { type: ObjectId, ref: "HotelDetails" },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("HouseKeeping", houseKeepingSchema);
