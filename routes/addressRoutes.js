const {
  createAddress,
  fetchAllAddress,
  editAddress,
  deleteAddress,
} = require("../controllers/addressController");
const authMiddleware = require("../middleware/authMiddleware");

const router = require("express").Router();

const multer = require("multer");

const upload = multer();

router.post("/", authMiddleware, upload.single("file"), createAddress);

router.get("/", authMiddleware, fetchAllAddress);

router.put("/:id", authMiddleware, upload.single("file"), editAddress);

router.delete("/:id", authMiddleware, deleteAddress);

module.exports = router;
