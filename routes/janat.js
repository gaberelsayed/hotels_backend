/** @format */

const express = require("express");
const router = express.Router();

const { userById } = require("../controllers/user");
const { createUpdateDocument, list } = require("../controllers/janat");

router.post("/janat-website/:documentId", createUpdateDocument);
router.get("/janat-website-document", list);

router.param("userId", userById);

module.exports = router;
