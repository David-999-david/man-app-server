const {
  createAddress,
  fetchAllAddress,
} = require("../controllers/addressController");
const authMiddleware = require("../middleware/authMiddleware");

const router = require("express").Router();

const multer = require("multer");

const upload = multer();

router.post("/", authMiddleware, upload.single("file"), createAddress);

router.get("/", authMiddleware, fetchAllAddress);

module.exports = router;
