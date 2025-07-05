const { Pool } = require("pg");
const pool = require("../db");
const supabase = require("../lib/supabase");

async function addAddress(
  userId,
  label,
  street,
  city,
  state,
  country,
  postalCode,
  fileBuffer,
  originalName,
  imageDesc
) {
  const { rows } = await pool.query(
    `
    insert into user_address
    (user_id,label,street,city,state,country,postal_code)
    values ($1,$2,$3,$4,$5,$6,$7)
    returning *
    `,
    [userId, label, street, city, state, country, postalCode]
  );

  const address = rows[0];

  if (fileBuffer && originalName) {
    const ext = originalName.split(".").pop();

    const path = `${address.id}.${ext}`;

    const { error: UpErr } = await supabase.storage
      .from("address")
      .upload(path, fileBuffer, { contentType: `image/${ext}` });
    if (UpErr) throw UpErr;

    const { data, error: UrlErr } = await supabase.storage
      .from("address")
      .getPublicUrl(path);
    if (UrlErr) throw UrlErr;

    const imageUrl = data.publicUrl;

    await pool.query(
      `
        insert into location_image
        (address_id,image_url,description)
        values ($1,$2,$3)
        `,
      [address.id, imageUrl, imageDesc]
    );

    const result = await pool.query(
      `
        select a.*,
        coalesce(
        jsonb_agg(
        jsonb_build_object(
        'url',i.image_url,
        'imageDesc',i.description
        )
        ) filter (where i.image_url is not null),
         '[]'::jsonb
        ) as images
         from user_address as a
         left join location_image as i
         on i.address_id = a.id
         where a.id=$1 and a.user_id=$2
         group by a.id
        `,
      [address.id, userId]
    );
    return result.rows[0];
  }

  return address;
}

async function getAllAddress(userId) {
  const result = await pool.query(
    `
    select a.*,
    coalesce(
    jsonb_agg(
    jsonb_build_object(
    'url',i.image_url,
    'imageDesc',i.description
    )
    ) filter (where i.image_url is not null),
     '[]'::jsonb
    ) as images
     from user_address as a
     left join location_image as i
     on i.address_id = a.id
      where user_id=$1
      group by a.id
      order by created_at desc
    `,
    [userId]
  );
  return result.rows;
}

async function updateAddress(
  userId,
  addressId,
  label,
  street,
  city,
  state,
  country,
  postalCode,
  imageDesc,
  fileBuffer,
  originalName
) {
  const updateRes = await pool.query(
    `
    update user_address
    set
    label=coalesce($1,label),
    street=coalesce($2,street),
    city=coalesce($3,city),
    state=coalesce($4,state),
    country=coalesce($5,country),
    postal_code=coalesce($6,postal_code),
    updated_at=now()
    where id =$7 and user_id=$8
    returning *
    `,
    [label, street, city, state, country, postalCode, addressId, userId]
  );

  if (updateRes.rows.length === 0) {
    throw new Error("Address failed to updated!");
  }

  const editedId = updateRes.rows[0].id;

  let imageUrl = null;

  if (fileBuffer && originalName) {
    const ext = originalName.split(".").pop();

    const path = `${editedId}.${ext}`;

    const { error: UpErr } = await supabase.storage
      .from("address")
      .upload(path, fileBuffer, { contentType: `image/${ext}`, upsert: true });
    if (UpErr) throw UpErr;

    const { data, error: UrlErr } = await supabase.storage
      .from("address")
      .getPublicUrl(path);
    if (UrlErr) throw UrlErr;

    imageUrl = data.publicUrl;
  }

  if (fileBuffer || imageDesc != null) {
    await pool.query(
      `
      insert into location_image
      (address_id,image_url,description) values ($1,$2,$3)
      on conflict (address_id)
      do update
      set image_url=coalesce(excluded.image_url,location_image.image_url),
      description=coalesce(excluded.description,location_image.description),
      updated_at=now()
      `,
      [editedId, imageUrl, imageDesc]
    );
  }

  const fetchRes = await pool.query(
    `
      select a.*,
      coalesce(
      jsonb_agg(
      jsonb_build_object(
      'url',i.image_url,
      'imageDesc',i.description
      )
      ) filter (where i.image_url is not null),
       '[]'::jsonb
      ) as images
       from user_address as a
       left join location_image as i
       on i.address_id=a.id
       where a.id=$1 and a.user_id=$2
       group by a.id
      `,
    [editedId, userId]
  );

  return fetchRes.rows[0];
}

async function removeAddress(userId, addressId) {
  const row = await pool.query(
    `
    select image_url from
    location_image 
    where address_id=$1
    `,
    [addressId]
  );

  if (row.rows.length > 0 && row.rows[0].image_url) {
    const imageURl = row.rows[0].image_url;

    const url = new URL(imageURl);

    const part = url.pathname.split("/address/");

    const path = part[1];

    const { error: RemoveErr } = await supabase.storage
      .from("address")
      .remove([path]);

    if (RemoveErr) throw RemoveErr;
  }

  const result = await pool.query(
    `
    delete from user_address
    where user_id=$1 and id=$2
    `,
    [userId, addressId]
  );

  if (result.rowCount === 0) {
    throw new Error(`Failed to delete address with id=${id}`);
  }

  return result.rowCount;
}

module.exports = { addAddress, getAllAddress, updateAddress, removeAddress };
