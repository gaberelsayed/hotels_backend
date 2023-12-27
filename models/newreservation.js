/** @format */

const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const newReservationSchema = new mongoose.Schema(
	{
		customer_details: {
			type: Object,
			trim: true,
			required: true,
			default: {
				name: "",
				phone: "",
				email: "",
			},
		},

		start_date: {
			type: Date,
			trim: true,
			required: true,
		},

		end_date: {
			type: Date,
			trim: true,
		},

		days_of_residence: {
			type: Number,
			trim: true,
		},
		payment_status: {
			type: String,
			trim: true,
			default: "Not Paid",
		},

		total_amount: {
			type: Number,
			trim: true,
		},

		booking_source: {
			type: String,
			trim: true,
			default: "From The Hotel",
		},

		belongsTo: { type: ObjectId, ref: "User" },
		hotelId: { type: ObjectId, ref: "HotelDetails" },
		roomId: [{ type: ObjectId, ref: "Rooms" }],
		pickedRoomsPricing: {
			type: Array,
			default: [],
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model("New_Reservation", newReservationSchema);
