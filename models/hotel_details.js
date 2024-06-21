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
		hotelFloors: {
			// How many floors in the hotel
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
				standardRooms: {
					count: 0,
					price: { basePrice: 0 },
					photos: [],
					description: "",
					amenities: [],
					pricingRate: [],
					roomColor: "#003366", // Dark Blue
				},
				singleRooms: {
					count: 0,
					price: { basePrice: 0 },
					photos: [],
					description: "",
					amenities: [],
					pricingRate: [],
					roomColor: "#8B0000", // Dark Red
				},
				doubleRooms: {
					count: 0,
					price: { basePrice: 0 },
					photos: [],
					description: "",
					amenities: [],
					pricingRate: [],
					roomColor: "#004d00", // Dark Green
				},
				twinRooms: {
					count: 0,
					price: { basePrice: 0 },
					photos: [],
					description: "",
					amenities: [],
					pricingRate: [],
					roomColor: "#800080", // Dark Purple
				},
				queenRooms: {
					count: 0,
					price: { basePrice: 0 },
					photos: [],
					description: "",
					amenities: [],
					pricingRate: [],
					roomColor: "#FF8C00", // Dark Orange
				},
				kingRooms: {
					count: 0,
					price: { basePrice: 0 },
					photos: [],
					description: "",
					amenities: [],
					pricingRate: [],
					roomColor: "#2F4F4F", // Dark Slate Gray
				},
				tripleRooms: {
					count: 0,
					price: { basePrice: 0 },
					photos: [],
					description: "",
					amenities: [],
					pricingRate: [],
					roomColor: "#8B4513", // Saddle Brown
				},
				quadRooms: {
					count: 0,
					price: { basePrice: 0 },
					photos: [],
					description: "",
					amenities: [],
					pricingRate: [],
					roomColor: "#00008B", // Navy
				},
				studioRooms: {
					count: 0,
					price: { basePrice: 0 },
					photos: [],
					description: "",
					amenities: [],
					pricingRate: [],
					roomColor: "#696969", // Dim Gray
				},
				suite: {
					count: 0,
					price: { basePrice: 0 },
					photos: [],
					description: "",
					amenities: [],
					pricingRate: [],
					roomColor: "#483D8B",
				},
				masterSuite: {
					count: 0,
					price: { basePrice: 0 },
					photos: [],
					description: "",
					amenities: [],
					pricingRate: [],
					roomColor: "#556B2F",
				},
				familyRooms: {
					count: 0,
					price: { basePrice: 0 },
					photos: [],
					description: "",
					amenities: [],
					pricingRate: [],
					roomColor: "#A52A2A",
				},

				individualBed: {
					count: 0,
					price: { basePrice: 0 },
					photos: [],
					description: "",
					amenities: [],
					pricingRate: [],
					roomColor: "#483D8B",
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
		stripe_account_id: {
			type: String,
			default: "",
		},
		propertyType: {
			type: Object,
			default: "hotel",
			lowercase: true,
		},
		pictures_testing: {
			type: Boolean,
			default: false,
		},
		location_testing: {
			type: Boolean,
			default: false,
		},
		rooms_pricing_testing: {
			type: Boolean,
			default: false,
		},
		activateHotel: {
			type: Boolean,
			default: false,
		},
		currency: {
			type: String, //Blank
			trim: true,
			lowercase: true,
			default: "SAR",
		},
		belongsTo: { type: ObjectId, ref: "User" },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("HotelDetails", hotel_detailsSchema);
