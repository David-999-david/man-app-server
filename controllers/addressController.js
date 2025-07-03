const { addAddress } = require("../services/addressService");

async function createAddress(req, res, next) {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: "Invalid user" });
  }

  const { label, street, city, state, country, postalCode } = req.body;

  if (!label || !street) {
    return res.status(401).json({ error: "Label or Street required!" });
  }

  const fileBuffer = req.file.buffer;
  const originalName = req.file.originalname;

  try {
    const created = await addAddress(
      userId,
      label,
      street,
      city,
      state,
      country,
      postalCode,
      fileBuffer,
      originalName
    );

    if (!created) {
      return res.status(400).json({ error: "Can't create new address" });
    }

    return res.status(201).json({
      error: false,
      success: true,
      data: created,
    });
  } catch (e) {
    next(e);
  }
}

module.exports = { createAddress };
