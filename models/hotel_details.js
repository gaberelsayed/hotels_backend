/** @format */

const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const hotel_detailsSchema = new mongoose.Schema(
	{
		hotelName: {
			type: String,
			trim: true,
			lowercase: true,
			required: true,
		},
		hotelCountry: {
			type: String,
			trim: true,
			lowercase: true,
			default: "",
		},

		hotelState: {
			type: String,
			trim: true,
			lowercase: true,
			default: "",
		},

		hotelCity: {
			type: String,
			trim: true,
			lowercase: true,
			default: "",
		},

		phone: {
			type: String,
			trim: true,
			lowercase: true,
			default: "",
		},

		hotelAddress: {
			type: String,
			trim: true,
			lowercase: true,
			default: "",
		},
		hotelAmenities: {
			type: Array,
			trim: true,
			default: ["WiFi", "Pool", "Gym"],
		},

		hotelFloors: {
			type: Number,
		},

		overallRoomsCount: {
			type: Number,
		},

		roomCountDetails: {
			type: Object,
			trim: true,
			lowercase: true,
			default: {
				standardRooms: 0,
				standardRoomsPrice: {
					basePrice: 0,
					seasonPrice: 0,
					weekendPrice: 0,
					lastMinuteDealPrice: 0,
				},
				singleRooms: 0,
				singleRoomsPrice: {
					basePrice: 0,
					seasonPrice: 0,
					weekendPrice: 0,
					lastMinuteDealPrice: 0,
				},
				doubleRooms: 0,
				doubleRoomsPrice: {
					basePrice: 0,
					seasonPrice: 0,
					weekendPrice: 0,
					lastMinuteDealPrice: 0,
				},
				twinRooms: 0,
				twinRoomsPrice: {
					basePrice: 0,
					seasonPrice: 0,
					weekendPrice: 0,
					lastMinuteDealPrice: 0,
				},
				queenRooms: 0,
				queenRoomsPrice: {
					basePrice: 0,
					seasonPrice: 0,
					weekendPrice: 0,
					lastMinuteDealPrice: 0,
				},
				kingRooms: 0,
				kingRoomsPrice: {
					basePrice: 0,
					seasonPrice: 0,
					weekendPrice: 0,
					lastMinuteDealPrice: 0,
				},
				tripleRooms: 0,
				tripleRoomsPrice: {
					basePrice: 0,
					seasonPrice: 0,
					weekendPrice: 0,
					lastMinuteDealPrice: 0,
				},
				quadRooms: 0,
				quadRoomsPrice: {
					basePrice: 0,
					seasonPrice: 0,
					weekendPrice: 0,
					lastMinuteDealPrice: 0,
				},
				studioRooms: 0,
				studioRoomsPrice: {
					basePrice: 0,
					seasonPrice: 0,
					weekendPrice: 0,
					lastMinuteDealPrice: 0,
				},
				suite: 0,
				suitePrice: {
					basePrice: 0,
					seasonPrice: 0,
					weekendPrice: 0,
					lastMinuteDealPrice: 0,
				},
				masterSuite: 0,
				masterSuitePrice: {
					basePrice: 0,
					seasonPrice: 0,
					weekendPrice: 0,
					lastMinuteDealPrice: 0,
				},
				familyRooms: 0,
				familyRoomsPrice: {
					basePrice: 0,
					seasonPrice: 0,
					weekendPrice: 0,
					lastMinuteDealPrice: 0,
				},
			},
		},

		pricingCalendar: {
			type: Array,
			default: [],
		},

		hotelPhotos: {
			type: Array,
			default: [],
		},

		hotelRating: {
			type: Number,
			default: 3.5,
		},

		parkingLot: {
			type: Boolean,
			default: true,
		},

		subscribed: {
			type: Boolean,
			default: false,
		},
		subscriptionToken: {
			type: String,
			default: "unavailable",
		},
		subscriptionId: {
			type: String,
			default: "unavailable",
		},

		belongsTo: { type: ObjectId, ref: "User" },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("HotelDetails", hotel_detailsSchema);
