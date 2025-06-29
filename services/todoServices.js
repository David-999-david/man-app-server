const pool = require("../db");

async function deleteMany(userId, ids) {
  const result = await pool.query(
    `
        delete from todo
        where id= any($1)
        and user_id = $2
        `,
    [ids, userId]
  );
  return result.rowCount;
}

async function changeStatus(userId, id, status) {
  const result = await pool.query(
    `
        update todo
        set completed = $1
        where id =$2 and user_id=$3
        returning *
        `,
    [status, id, userId]
  );
  if (result.rowCount === 0) {
    throw new Error("Todo not found for updated status");
  }

  return result.rows[0];
}

module.exports = { deleteMany, changeStatus };
