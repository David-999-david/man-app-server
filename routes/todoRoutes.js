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

const router = express.Router();

router.get("/", authMiddleware, getAllTodo);

router.get("/:id", authMiddleware, getTodoById);

router.post("/", authMiddleware, createTodo);

router.put("/:id", authMiddleware, editTodo);

router.delete("/batch", authMiddleware, removeMany);

router.delete("/:id", authMiddleware, remove);

router.delete("/", authMiddleware, removeAll);

router.put("/status/:id", authMiddleware, updateStatus);

module.exports = router;
