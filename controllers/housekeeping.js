const HouseKeeping = require("../models/housekeeping");
const mongoose = require("mongoose");

exports.create = (req, res) => {
	const houseKeeping = new HouseKeeping(req.body);
	houseKeeping.save((err, data) => {
		if (err) {
			console.log(err, "err");
			return res.status(400).json({
				error: "Cannot Create houseKeeping",
			});
		}
		res.json({ data });
	});
};

exports.updateHouseKeepingTask = (req, res) => {
	const taskId = req.params.taskId;
	const updateData = req.body;

	HouseKeeping.findByIdAndUpdate(
		taskId,
		updateData,
		{ new: true }, // returns the updated document
		(err, updateHouseKeeping) => {
			if (err) {
				// Handle possible errors
				console.error(err);
				return res.status(500).send({ error: "Internal server error" });
			}
			if (!updateHouseKeeping) {
				// Handle the case where no house keeping task are found with the given ID
				return res.status(404).send({ error: "task not found" });
			}
			// Successfully updated
			res.json(updateHouseKeeping);
		}
	);
};

exports.list = async (req, res) => {
	const hotelId = mongoose.Types.ObjectId(req.params.hotelId);
	const page = parseInt(req.params.page) || 1;
	const records = parseInt(req.params.records) || 10;

	try {
		const totalCount = await HouseKeeping.countDocuments({ hotelId: hotelId });

		const houseKeepingTasks = await HouseKeeping.aggregate([
			{ $match: { hotelId: hotelId } },
			{
				$lookup: {
					from: "rooms",
					localField: "rooms",
					foreignField: "_id",
					as: "rooms",
				},
			},
			{
				$lookup: {
					from: "hotels",
					localField: "hotelId",
					foreignField: "_id",
					as: "hotelId",
				},
			},
			{
				$lookup: {
					from: "users",
					localField: "cleanedBy",
					foreignField: "_id",
					as: "cleanedBy",
				},
			},
			{
				$lookup: {
					from: "users",
					localField: "assignedTo",
					foreignField: "_id",
					as: "assignedTo",
				},
			},
			{
				$addFields: {
					cleanedBy: {
						$cond: {
							if: { $eq: [{ $size: "$cleanedBy" }, 0] },
							then: { name: "Not Cleaned" },
							else: { $arrayElemAt: ["$cleanedBy", 0] },
						},
					},
					assignedTo: {
						$cond: {
							if: { $eq: [{ $size: "$assignedTo" }, 0] },
							then: { name: "Not Assigned" },
							else: { $arrayElemAt: ["$assignedTo", 0] },
						},
					},
				},
			},
			{ $sort: { taskDate: -1 } }, // Sort by taskDate in descending order
			{ $skip: (page - 1) * records },
			{ $limit: records },
		]);

		res.json({
			data: houseKeepingTasks,
			total: totalCount,
			currentPage: page,
			totalPages: Math.ceil(totalCount / records),
		});
	} catch (err) {
		console.log(err, "err");
		return res.status(400).json({
			error: "Error retrieving housekeeping list",
		});
	}
};

exports.totalDocumentCount = async (req, res) => {
	const hotelId = mongoose.Types.ObjectId(req.params.hotelId);
	try {
		const totalCount = await HouseKeeping.countDocuments({ hotelId: hotelId });
		res.json({
			totalDocuments: totalCount,
		});
	} catch (err) {
		console.log(err, "err");
		res.status(400).json({
			error: "Error retrieving total document count",
		});
	}
};

exports.remove = (req, res) => {
	const houseKeeping = req.houseKeeping;

	houseKeeping.remove((err, data) => {
		if (err) {
			return res.status(400).json({
				err: "error while removing",
			});
		}
		res.json({ message: "houseKeeping deleted" });
	});
};

exports.listOfTasksForEmployee = async (req, res) => {
	const userId = req.params.userId;

	try {
		const tasks = await HouseKeeping.find({
			assignedTo: userId,
			task_status: "unfinished",
		})
			.populate("assignedTo")
			.populate("rooms")
			.populate("hotelId");

		res.json(tasks);
	} catch (err) {
		console.error(err);
		res.status(500).json({
			error: "Error retrieving tasks for employee",
		});
	}
};
