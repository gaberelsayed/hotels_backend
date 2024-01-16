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
				name: "", // firstname + lastname
				phone: "", //address.phone
				email: "", //address.email
				passport: "", //guest_national_id
				passportExpiry: "",
				nationality: "", //country
			},
		},

		start_date: {
			type: Date, //checkin_date
			trim: true,
			required: true,
		},

		end_date: {
			type: Date, //checkout_date
			trim: true,
		},

		days_of_residence: {
			type: Number, //The difference between checkout_date & checkin_date
			trim: true,
		},

		payment_status: {
			type: String, //Leave Default
			trim: true,
			default: "Not Paid",
		},

		payment: {
			type: String, //Leave Default
			trim: true,
			default: "",
		},

		overallBookingStatus: {
			type: String, //Leave Default
			trim: true,
			default: "Open",
		},

		total_amount: {
			type: Number, //total
			trim: true,
		},

		booking_source: {
			type: String, //channel_display.toLowerCase()
			trim: true,
			default: "Reception",
		},

		booking_comment: {
			type: String, //note
			trim: true,
			default: "",
		},

		sms_notification: {
			type: Boolean, //Leave Default
			default: false,
		},

		provider_number: {
			type: String, //provider_number
			trim: true,
			default: "",
		},

		confirmation_number: {
			type: String, //reservation_id
			trim: true,
			default: "",
		},

		belongsTo: { type: ObjectId, ref: "User" }, //This will be sent from the frontend
		hotelId: { type: ObjectId, ref: "HotelDetails" }, //This will be sent from the frontend

		pickedRoomsType: {
			type: Array, //Here I only need you to look at the rooms array in the hotel runner object I gave and give me the array with the object below
			default: [
				{
					room_type: "", // "name" from rooms array
					chosenPrice: "", //"total" from the rooms array
					count: 1, // leave the default because each object in the rooms array is supposed to be only 1 room
				},
			],
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Pre_Reservation", prereservationSchema);
