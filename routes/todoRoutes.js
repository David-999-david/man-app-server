const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getAllTodo,
  getTodoById,
  createTodo,
  editTodo,
  remove,
  removeAll,
} = require("../controllers/todoController");

const router = express.Router();

router.get("/", authMiddleware, getAllTodo);

router.get("/:id", authMiddleware, getTodoById);

router.post("/", authMiddleware, createTodo);

router.put("/:id", authMiddleware, editTodo);

router.delete("/:id", authMiddleware, remove);

router.delete("/", authMiddleware, removeAll);

module.exports = router;
