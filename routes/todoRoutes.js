const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getAllTodo,
  getTodoById,
  createTodo,
  editTodo,
  remove,
  removeAll,
  removeMany,
  updateStatus,
} = require("../controllers/todoController");
const multer = require("multer");
const upload = multer();

const router = express.Router();

router.get("/", authMiddleware, getAllTodo);

router.get("/:id", authMiddleware, getTodoById);

router.post("/", authMiddleware, upload.single("file"), createTodo);

router.put("/:id", authMiddleware, upload.single("file"), editTodo);

router.delete("/batch", authMiddleware, removeMany);

router.delete("/:id", authMiddleware, remove);

router.delete("/", authMiddleware, removeAll);

router.put("/status/:id", authMiddleware, updateStatus);

module.exports = router;
