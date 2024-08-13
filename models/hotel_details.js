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
			type: [
				{
					roomType: String, // E.g., "standardRooms"
					count: Number,
					price: { basePrice: Number },
					photos: Array,
					displayName: String, // E.g., "Ocean View Standard Room"
					description: String,
					amenities: Array,
					pricingRate: Array,
					roomColor: String,
					activeRoom: Boolean,
				},
			],
			default: [{ activeRoom: true }],
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
		location: {
			type: {
				type: String,
				enum: ["Point"], // 'location.type' must be 'Point'
				required: true,
				default: "Point",
			},
			coordinates: {
				type: [Number],
				required: true,
				default: [0, 0], // Default to coordinates [longitude, latitude]
			},
		},
		belongsTo: { type: ObjectId, ref: "User" },
	},
	{ timestamps: true }
);

module.exports = mongoose.model("HotelDetails", hotel_detailsSchema);
