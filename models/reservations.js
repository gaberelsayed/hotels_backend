/** @format */

const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const reservationsSchema = new mongoose.Schema(
	{
		reservation_id: {
			type: String,
			trim: true,
			lowercase: true,
			default: "",
		},
		hr_number: {
			type: String,
			trim: true,
			lowercase: true,
			default: "",
		},

		confirmation_number: {
			type: String,
			trim: true,
			lowercase: true,
			required: true,
		},
		pms_number: {
			type: String,
			trim: true,
			lowercase: true,
			default: "",
		},
		booking_source: {
			type: String,
			trim: true,
			lowercase: true,
			default: "",
		},
		customer_details: {
			type: Object,
			trim: true,
			default: {
				name: "", // firstname + lastname
				phone: "", //address.phone
				email: "", //address.email
				passport: "", //guest_national_id
				passportExpiry: "",
				nationality: "", //country
			},
		},
		state: {
			type: String,
			trim: true,
			lowercase: true,
			default: "confirmed",
		},
		reservation_status: {
			type: String,
			trim: true,
			lowercase: true,
			default: "confirmed",
		},
		total_guests: {
			type: Number,
			default: 1,
		},
		pickedRoomsPricing: {
			type: Array,
			default: [],
		},
		total_rooms: {
			type: Number,
			default: 1,
		},

		cancel_reason: {
			type: String,
			trim: true,
			lowercase: true,
			default: "",
		},
		booked_at: {
			type: Date,
			trim: true,
			lowercase: true,
			default: new Date(),
		},

		inhouse_date: {
			type: Date,
			trim: true,
			lowercase: true,
			default: "",
		},

		sub_total: {
			type: Number,
			trim: true,
			lowercase: true,
			default: 0,
		},
		extras_total: {
			type: Number,
			trim: true,
			lowercase: true,
			default: 0,
		},

		tax_total: {
			type: Number,
			trim: true,
			lowercase: true,
			default: 0,
		},
		total_amount: {
			type: Number,
			trim: true,
			lowercase: true,
			default: 0,
		},
		currency: {
			type: String,
			trim: true,
			lowercase: true,
			default: "SAR",
		},
		checkin_date: {
			type: Date,
			default: "",
		},
		checkout_date: {
			type: Date,
			default: "",
		},
		days_of_residence: {
			type: Number,
			default: 0,
		},
		comment: {
			type: String,
			trim: true,
			lowercase: true,
			default: "",
		},
		payment: {
			type: String,
			trim: true,
			lowercase: true,
			default: "",
		},
		payment_details: {
			type: Object,
			trim: true,
			lowercase: true,
		},
		paid_amount: {
			type: Number,
			trim: true,
			lowercase: true,
			default: 0,
		},

		payments: {
			type: Object,
			trim: true,
			lowercase: true,
			default: {
				state: "checkout",
				amount: "5329.06",
				currency: "SAR",
				exchanged_amount: "0.0",
				exchange_currency: "SAR",
				exchange_rate: "0.0",
				paid_at: null,
				payment_method_name: "Cash",
				payment_method: "cash",
				installment: null,
				response_code: null,
			},
		},
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
		roomId: [{ type: ObjectId, ref: "Rooms", default: null }],
		belongsTo: { type: ObjectId, ref: "User" },
		hotelId: { type: ObjectId, ref: "HotelDetails" },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Reservations", reservationsSchema);
