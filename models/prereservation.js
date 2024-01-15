/** @format */

const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const prereservationSchema = new mongoose.Schema(
	{
		customer_details: {
			type: Object,
			trim: true,
			required: true,
			default: {
				name: "",
				phone: "",
				email: "",
				passport: "",
				passportExpiry: "",
				nationality: "",
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

		overallBookingStatus: {
			type: String,
			trim: true,
			default: "Open",
		},

		total_amount: {
			type: Number,
			trim: true,
		},

		booking_source: {
			type: String,
			trim: true,
			default: "Reception",
		},

		booking_comment: {
			type: String,
			trim: true,
			default: "",
		},

		sms_notification: {
			type: Boolean,
			default: false,
		},

		confirmation_number: {
			type: String,
			trim: true,
			default: "",
		},

		belongsTo: { type: ObjectId, ref: "User" },
		hotelId: { type: ObjectId, ref: "HotelDetails" },

		pickedRoomsType: {
			type: Array,
			default: [],
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Pre_Reservation", prereservationSchema);
