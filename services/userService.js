const pool = require("../db.js");
const supabase = require("../lib/supabase.js");

async function uploadAvatar(userId, fileBuffer, originalName) {
  const ext = originalName.split(".").pop() || "png";
  const path = `${userId}-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, fileBuffer, { contentType: `image/${ext}` });
  if (upErr) throw upErr;

  const { data, error: urlErr } = supabase.storage
    .from("avatars")
    .getPublicUrl(path);
  if (urlErr) throw urlErr;
  const publicUrl = data.publicUrl;

  await pool.query(
    `
        update users 
        set profile_image_url = $1 where id=$2
        `,
    [publicUrl, userId]
  );

  return publicUrl;
}



module.exports = { uploadAvatar };
