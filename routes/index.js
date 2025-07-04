const express = require("express");
const authroutes = require("./userRoutes");
const todoRoutes = require("./todoRoutes");
const address = require("../routes/addressRoutes");

const router = express.Router();

router.use("/auth", authroutes);
router.use("/todos", todoRoutes);
router.use("/address", address);

module.exports = router;
