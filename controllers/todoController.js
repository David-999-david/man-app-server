const pool = require("../db.js");

const todoService = require("../services/todoServices.js");

async function createTodo(req, res, next) {
  try {
    const { title, description, imageDescription } = req.body;

    const userId = req.userId;

    if (userId == null) {
      return res.status(401).json({ error: "Invalid user" });
    }

    if (title == null || description == null) {
      return res.status(401).json({ error: "Fields require" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file upload" });
    }

    const fileBuffer = req.file.buffer;
    const originalName = req.file.originalname;

    const createdTodo = await todoService.createTodo(
      userId,
      title,
      description,
      imageDescription,
      fileBuffer,
      originalName
    );

    return res.status(201).json({
      error: false,
      success: true,
      data: createdTodo,
    });
  } catch (e) {
    return next(e);
  }
}

async function getAllTodo(req, res, next) {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: "Invalid user" });
  }

  const { q, page, limit } = req.query;

  try {
    const {
      limit: L,
      page: P,
      todos,
      itemCounts,
      totalCounts,
      totalPage,
    } = await todoService.getAll(userId, q, page, limit);

    return res.status(200).json({
      error: false,
      success: true,
      data: todos,
      meta: {
        limit: L,
        page: P,
        itemCounts,
        totalCounts,
        totalPage,
      },
    });
  } catch (e) {
    return next(e);
  }
}

async function getTodoById(req, res, next) {
  const id = req.params.id;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: "Invalid user" });
  }

  try {
    const { rows } = await pool.query(
      `
        select id,title,description,completed,created_at,updated_at
        from todo
        where id=$1 and user_id = $2
        `,
      [id, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: `Cannot find todo with id=${id}` });
    }

    const todo = rows[0];

    return res.status(200).json({
      error: false,
      success: true,
      data: todo,
    });
  } catch (e) {
    return next(e);
  }
}

async function editTodo(req, res, next) {
  const userId = req.userId;
  const id = req.params.id;

  const { title, description, completed, imageDesc } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "Invalid User" });
  }

  if (
    title == undefined &&
    description == undefined &&
    completed == undefined
  ) {
    return res.status(400).json({ error: "At least one must be provided" });
  }

  // if (!req.file) {
  //   return res.status(400).json({ error: "No file upload" });
  // }

  const fileBuffer = req.file ? req.file.buffer : null;
  const originalName = req.file ? req.file.originalname : null;

  try {
    const todo = await todoService.putTodo(
      userId,
      id,
      title,
      description,
      completed,
      originalName,
      fileBuffer,
      imageDesc
    );

    return res.status(200).json({
      error: false,
      success: true,
      data: todo,
      message: "Updated successfully",
    });
  } catch (e) {
    return next(e);
  }
}

// async function remove(req, res, next) {
//   const userId = req.userId;
//   const id = req.params.id;

//   if (!userId) {
//     return res.status(401).json({ error: "Invalid user" });
//   }

//   try {
//     const result = await pool.query(
//       `
//         delete from todo
//         where id=$1 and user_id=$2
//         `,
//       [id, userId]
//     );

//     if (result.rowCount === 0) {
//       res.status(404).json({ error: `Failed to delete with id=${id}` });
//     }

//     return res.status(200).json({
//       error: false,
//       success: true,
//       message: `Delete id=${id} success`,
//     });
//   } catch (e) {
//     return next(e);
//   }
// }

async function remove(req, res, next) {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: "Invalid user" });
  }

  const todoId = req.params.id;

  if (!todoId) {
    return res.status(401).json({ error: `Can't find todo with id=${id}` });
  }

  try {
    await todoService.removeTodo(userId, todoId);

    return res.status(200).json({
      error: false,
      success: true,
      message: "Delete success",
    });
  } catch (e) {
    return next(e);
  }
}

async function removeMany(req, res, next) {
  const userId = req.userId;
  const { ids } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "Invalid user" });
  }
  if (!Array.isArray(ids) || ids.length == 0) {
    return res.status(401).json({ error: "No ids provided" });
  }

  try {
    const count = await todoService.deleteMany(userId, ids);
    return res.status(200).json({ error: false, deleted: count });
  } catch (e) {
    return next(e);
  }
}

async function removeAll(req, res, next) {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: "Invalid user" });
  }

  try {
    const result = await pool.query(
      `
        delete from todo where user_id=$1
        `,
      [userId]
    );

    const deleteCount = result.rowCount;

    return res.status(200).json({
      error: false,
      success: true,
      message: `Delete all items=${deleteCount} success....`,
    });
  } catch (e) {
    return next(e);
  }
}

async function updateStatus(req, res, next) {
  const userId = req.userId;
  const id = req.params.id;
  const { completed } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "Invalid user" });
  }
  if (!id) {
    return res.status(400).json({ error: `Can't find item with id=${id}` });
  }
  if (typeof completed !== "boolean") {
    return res.status(400).json({ error: `${completed} must be boolean` });
  }
  try {
    const updatedItem = await todoService.changeStatus(userId, id, completed);

    if (!updatedItem) {
      return res
        .status(401)
        .json({ error: `Can't update status for items with id=${id}` });
    }
    return res.status(200).json({
      success: true,
      updatedTodo: updatedItem,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createTodo,
  getAllTodo,
  getTodoById,
  editTodo,
  remove,
  removeAll,
  removeMany,
  updateStatus,
};
