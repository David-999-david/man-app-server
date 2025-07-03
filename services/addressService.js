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

module.exports = { addAddress };
