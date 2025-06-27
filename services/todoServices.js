const pool = require("../db");

async function deleteMany(userId, ids) {
    const result = await pool.query(
        `
        delete from todo
        where id= any($1)
        and user_id = $2
        `,
        [ids,userId]
    );
    return result.rowCount;
}

module.exports = {deleteMany};