const express = require("express");
const { getPublicBranding } = require("../Controller/BrandingController");

const router = express.Router();

router.get("/", getPublicBranding);

module.exports = router;
