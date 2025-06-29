const pool = require("../db.js");

const todoService = require("../services/todoServices.js");

async function createTodo(req, res, next) {
  const { title, description } = req.body;
  const userId = req.userId;

  if (userId == null) {
    return res.status(401).json({ error: "Invalid user" });
  }

  if (title == null || description == null) {
    return res.status(401).json({ error: "Fields require" });
  }

  try {
    const result = await pool.query(
      `
        insert into todo (user_id,title,description)
        values ($1,$2,$3) returning *
        `,
      [userId, title, description]
    );

    const todo = result.rows[0];

    if (!todo) {
      return res.status(500).json({ error: "Failed to add todo" });
    }

    return res.status(201).json({
      error: false,
      success: true,
      data: todo,
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

  const { q } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit, 10) || 20, 1);
  const offset = (page - 1) * limit;

  let result, countResult;

  try {
    if (q) {
      const pattern = `%${q}%`;

      result = await pool.query(
        ` 
        select id,title,description,completed,created_at,updated_at from todo
        where user_id = $1 and
        (title ilike $2 or description ilike $2)
        order by created_at desc
        limit $3 offset $4
        `,
        [userId, pattern, limit, offset]
      );

      countResult = await pool.query(
        `select count(*) from todo where user_id = $1 
        and (title ilike $2 or description ilike $2)`,
        [userId, pattern]
      );
    } else {
      result = await pool.query(
        `
        select id,title,description,completed,created_at,updated_at from todo
        where user_id = $1 order by created_at desc
        limit $2 offset $3 
        `,
        [userId, limit, offset]
      );

      countResult = await pool.query(
        `select count(*) from todo where user_id = $1`,
        [userId]
      );
    }

    const todos = result.rows;

    const itemCounts = todos.length;

    const totalCounts = parseInt(countResult.rows[0].count, 10);

    res.status(200).json({
      error: false,
      success: true,
      data: todos,
      meta: {
        limit,
        page,
        itemCounts,
        totalCounts,
        totalPage: Math.ceil(totalCounts / limit),
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

  const { title, description, completed } = req.body;

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
  try {
    const { rows } = await pool.query(
      `
        update todo
        set title = coalesce($1,title),
            description = coalesce($2,description),
            completed = coalesce($3,completed),
            updated_at = now()
        where id=$4 and user_id=$5
        returning *
        `,
      [title, description, completed, id, userId]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: `Failed to update todo with id =${id}` });
    }

    const todo = rows[0];

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

async function remove(req, res, next) {
  const userId = req.userId;
  const id = req.params.id;

  if (!userId) {
    return res.status(401).json({ error: "Invalid user" });
  }

  try {
    const result = await pool.query(
      `
        delete from todo
        where id=$1 and user_id=$2
        `,
      [id, userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: `Failed to delete with id=${id}` });
    }

    return res.status(200).json({
      error: false,
      success: true,
      message: `Delete id=${id} success`,
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
  const { status } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "Invalid user" });
  }
  if (!id) {
    return res.status(400).json({ error: `Can't find item with id=${id}` });
  }
  if (typeof status !== "boolean") {
    return res.status(400).json({ error: `${status} must be boolean` });
  }
  try {
    const updatedItem = await todoService.changeStatus(userId, id, status);

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
