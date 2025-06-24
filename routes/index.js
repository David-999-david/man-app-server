const express = require("express");
const authroutes = require("./userRoutes");
const todoRoutes = require("./todoRoutes");

const router = express.Router();

router.use("/auth", authroutes);
router.use("/todos", todoRoutes);

module.exports = router;
