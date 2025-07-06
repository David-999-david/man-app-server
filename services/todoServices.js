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

async function changeStatus(userId, id, completed) {
  const resultA = await pool.query(
    `
        update todo
        set completed = $1
        where id =$2 and user_id=$3
        `,
    [completed, id, userId]
  );
  if (resultA.rowCount === 0) {
    throw new Error("Todo not found for updated status");
  }

  const result = await pool.query(
    `
    select t.*,
    coalesce(
    jsonb_agg(
    jsonb_build_object(
    'url',i.image_url,
    'imageDesc',i.description
    )
    ) filter (where i.image_url is not null),
     '[]'::jsonb
    ) as images
     from todo as t
     left join todo_image as i
     on i.todo_id = t.id
     where t.id =$1 and t.user_id=$2
     group by t.id
    `,
    [id, userId]
  );

  if (result.rows.length === 0) {
    throw new Error("Todo no found after edited status");
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
  const path = `${todoId}.${ext}`;

  const { error: UpErr } = await supabase.storage
    .from("todo-images")
    .upload(path, fileBuffer, { contentType: `image/${ext}`, upsert: true });
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
    jsonb_agg(
    jsonb_build_object(
    'url',i.image_url,
    'imageDesc',i.description
    )
    ) filter (where i.image_url is not null),
     '[]'::jsonb
    ) as images
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

    // result = await pool.query(
    //   `
    //   select t.*,
    //   coalesce(
    //   array_agg(i.image_url) filter (where i.image_url is not null),
    //   array[]::text[]
    //   ) as image_urls
    //    from todo as t
    //    left join todo_image as i on i.todo_id = t.id
    //    where t.user_id=$1 and (t.title iLike $2 or t.description ilike $2)
    //    group by t.id
    //    order by created_at desc
    //    limit $3 offset $4
    //   `,
    //   [userId, pattern, limit, offset]
    // );

    result = await pool.query(
      `
      select t.*,
      coalesce(
      jsonb_agg(
      jsonb_build_object(
      'url', i.image_url,
      'imageDesc',i.description
      )
      ) filter (where i.image_url is not null),
       '[]'::jsonb
      ) as images
       from todo as t
       left join todo_image as i
       on i.todo_id = t.id
       where t.user_id=$1 and
       (t.title ilike $2 or t.description ilike $2)
       group by t.id
       order by t.created_at desc
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
    // result = await pool.query(
    //   `
    //   select t.*,
    //   coalesce(
    //   array_agg(i.image_url) filter (where i.image_url is not null),
    //   array[]::text[]
    //   ) as image_urls
    //    from todo as t
    //    left join todo_image as i on i.todo_id = t.id
    //    where t.user_id=$1
    //    group by t.id
    //    order by created_at desc
    //    limit $2 offset $3
    //   `,
    //   [userId, limit, offset]
    // );

    result = await pool.query(
      `
      select t.*,
      coalesce(
      jsonb_agg(
      jsonb_build_object(
      'url', i.image_url,
      'imageDesc',i.description
      )
      ) filter (where i.image_url is not null),
       '[]'::jsonb
      ) as images
       from todo as t
       left join todo_image as i 
       on i.todo_id = t.id
       where t.user_id=$1
       group by t.id
       order by t.created_at desc
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

async function putTodo(
  userId,
  todoId,
  title,
  description,
  completed,
  originalName,
  fileBuffer,
  imageDesc
) {
  await pool.query(
    `
    update todo
    set title = coalesce($1,title),
        description = coalesce($2,description),
        completed = coalesce($3,completed),
        updated_at = now()
    where id = $4 and user_id = $5
    `,
    [title, description, completed, todoId, userId]
  );

  let editedTodo;

  if (fileBuffer && originalName) {
    const ext = originalName.split(".").pop();
    const path = `${todoId}.${ext}`;

    const { err: UpErr } = await supabase.storage
      .from("todo-images")
      .upload(path, fileBuffer, { contentType: `image/${ext}`, upsert: true });
    if (UpErr) throw UpErr;

    const { data, err: UrlErr } = await supabase.storage
      .from("todo-images")
      .getPublicUrl(path);
    if (UrlErr) throw UrlErr;

    const imageUrl = data.publicUrl;

    await pool.query(
      `
    update todo_image 
    set 
    image_url = coalesce($1,image_url),
    description=coalesce($2,description),
    updated_at= now()
    where todo_id=$3
    `,
      [imageUrl, imageDesc, todoId]
    );

    const result = await pool.query(
      `
    select t.*,
    coalesce(
    jsonb_agg(
    jsonb_build_object(
    'url',i.image_url,
    'imageDesc',i.description
    ) 
    ) filter (where i.image_url is not null),
     '[]'::jsonb
    )as images
    from todo as t
    left join todo_image as i
    on i.todo_id = t.id
    where t.id=$1 and t.user_id=$2
    group by t.id
    `,
      [todoId, userId]
    );

    editedTodo = result.rows[0];
  } else {
    await pool.query(
      `
    update todo_image
    set
    description = coalesce($1,description)
    where todo_id=$2
    `,
      [imageDesc, todoId]
    );

    const result = await pool.query(
      `
    select t.*,
    coalesce(
    jsonb_agg(
    jsonb_build_object(
    'url',i.image_url,
    'imageDesc',i.description
    ) 
    ) filter (where i.image_url is not null),
     '[]'::jsonb
    )as images
    from todo as t
    left join todo_image as i
    on i.todo_id = t.id
    where t.id=$1 and t.user_id=$2
    group by t.id
    `,
      [todoId, userId]
    );

    editedTodo = result.rows[0];
  }

  return editedTodo;
}

async function removeTodo(userId, todoId) {
  const { rows } = await pool.query(
    `
    select image_url
    from todo_image
    where todo_id=$1
    `,
    [todoId]
  );

  if (rows.length > 0 && rows[0].image_url) {
    const imageURl = rows[0].image_url;

    const url = new URL(imageURl);

    const part = url.pathname.split("/todo-images/");

    const path = part[1];

    const { error: RemoveErr } = await supabase.storage
      .from("todo-images")
      .remove([path]);
    if (RemoveErr) throw RemoveErr;
  }

  const result = await pool.query(
    `
    delete from todo
    where user_id=$1 and id=$2
    `,
    [userId, todoId]
  );

  if (result.rowCount === 0) {
    throw new Error(`Failed to remove todo with id=${todoId}`);
  }
  return result.rowCount;
}

module.exports = {
  deleteMany,
  changeStatus,
  createTodo,
  getAll,
  putTodo,
  removeTodo,
};
