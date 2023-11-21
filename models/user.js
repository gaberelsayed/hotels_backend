/** @format */

const mongoose = require("mongoose");
const crypto = require("crypto");
const { v1: uuidv1 } = require("uuid");
const { ObjectId } = mongoose.Schema;

const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			trim: true,
			required: true,
			maxlength: [32, "Too long"],
		},
		email: {
			type: String,
			trim: true,
			required: true,
			unique: true,
			lowercase: true,
		},
		hashed_password: {
			type: String,
			required: true,
		},
		hotelName: {
			type: String,
			trim: true,
			lowercase: true,
		},
		hotelCountry: {
			type: String,
			trim: true,
			lowercase: true,
		},

		hotelState: {
			type: String,
			trim: true,
			lowercase: true,
		},

		hotelCity: {
			type: String,
			trim: true,
			lowercase: true,
		},

		phone: {
			type: String,
			trim: true,
			lowercase: true,
		},

		hotelAddress: {
			type: String,
			trim: true,
			lowercase: true,
		},

		salt: String,

		employeeImage: String,

		role: {
			type: Number,
			default: 0,
		},

		resetPasswordLink: {
			data: String,
			default: "",
		},

		activeUser: {
			type: Boolean,
			default: true,
		},
	},
	{ timestamps: true }
);

// virtual field
userSchema
	.virtual("password")
	.set(function (password) {
		this._password = password;
		this.salt = uuidv1();
		this.hashed_password = this.encryptPassword(password);
	})
	.get(function () {
		return this._password;
	});

userSchema.methods = {
	authenticate: function (plainText) {
		return this.encryptPassword(plainText) === this.hashed_password;
	},

	encryptPassword: function (password) {
		if (!password) return "";
		try {
			return crypto
				.createHmac("sha1", this.salt)
				.update(password)
				.digest("hex");
		} catch (err) {
			return "";
		}
	},
};

module.exports = mongoose.model("User", userSchema);
