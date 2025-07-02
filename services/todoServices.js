const pool = require("../db");
const supabase = require("../lib/supabase");

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

async function createTodo(
  userId,
  title,
  description,
  imageDescription,
  fileBuffer,
  originalName
) {
  const insertTodo = await pool.query(
    `
    insert into todo (title,description,user_id)
    values ($1,$2,$3) returning id
    `,
    [title, description, userId]
  );

  if (insertTodo.rowCount == 0) {
    throw new Error("Failed to added todo");
  }

  const todoId = insertTodo.rows[0].id;

  const ext = originalName.split(".").pop();
  const path = `${todoId}-${Date.now()}.${ext}`;

  const { error: UpErr } = await supabase.storage
    .from("todo-images")
    .upload(path, fileBuffer, { contentType: `image/${ext}` });
  if (UpErr) throw UpErr;

  const { data, error: UrlErr } = await supabase.storage
    .from("todo-images")
    .getPublicUrl(path);
  if (UrlErr) throw UrlErr;

  const imageUrl = data.publicUrl;

  const insertImage = await pool.query(
    `
    insert into todo_image (todo_id,image_url,description)
    values ($1,$2,$3) returning *
    `,
    [todoId, imageUrl, imageDescription]
  );

  if (insertImage.rowCount === 0) throw new Error("Failed to save todo_image");

  const row = await pool.query(
    `
    select t.*,
    coalesce(
    array_agg(i.image_url) filter (where i.image_url is not null),
    array[]::text[]
    ) as image_urls
     from todo as t
     left join todo_image as i on i.todo_id = t.id
     where t.id=$1 and t.user_id=$2
     group by t.id
    `,
    [todoId, userId]
  );

  // const singleImageTodo = await pool.query(
  //   `
  //   select t.*,
  //   i.image_url
  //   from todo as t
  //   left join todo_image as i on i.todo_id = t.id
  //   where t.id=$1 and t.user_id =$2
  //   `,
  //   [todoId, userId]
  // );

  const createdTodo = row.rows[0];

  return createdTodo;
}

async function getAll(userId, q, page, limit) {
  page = Math.max(parseInt(page, 10) || 1, 1);
  limit = Math.max(parseInt(limit, 10) || 20, 1);
  const offset = (page - 1) * limit;

  let result, countResult;

  if (q) {
    const pattern = `%${q}%`;

    result = await pool.query(
      `
      select t.*,
      coalesce(
      array_agg(i.image_url) filter (where i.image_url is not null),
      array[]::text[]
      ) as image_urls
       from todo as t
       left join todo_image as i on i.todo_id = t.id
       where t.user_id=$1 and (t.title iLike $2 or t.description ilike $2)
       group by t.id
       order by created_at desc
       limit $3 offset $4
      `,
      [userId, pattern, limit, offset]
    );

    countResult = await pool.query(
      `
      select count(*) from todo where user_id=$1
      and (title ilike $2 or description ilike $2)
      `,
      [userId, pattern]
    );
  } else {
    result = await pool.query(
      `
      select t.*,
      coalesce(
      array_agg(i.image_url) filter (where i.image_url is not null),
      array[]::text[]
      ) as image_urls
       from todo as t
       left join todo_image as i on i.todo_id = t.id
       where t.user_id=$1
       group by t.id
       order by created_at desc
       limit $2 offset $3
      `,
      [userId, limit, offset]
    );

    countResult = await pool.query(
      `
      select count(*) from todo where user_id=$1
      `,
      [userId]
    );
  }

  const todos = result.rows;

  const itemCounts = todos.length;

  const totalCounts = parseInt(countResult.rows[0].count, 10);

  const totalPage = Math.ceil(totalCounts / limit);

  return { limit, page, todos, itemCounts, totalCounts, totalPage };
}

module.exports = { deleteMany, changeStatus, createTodo, getAll };
