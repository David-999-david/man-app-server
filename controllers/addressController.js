const { addAddress, getAllAddress } = require("../services/addressService");

async function createAddress(req, res, next) {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: "Invalid user" });
  }

  const { label, street, city, state, country, postalCode, imageDesc } =
    req.body;

  if (!label || !street) {
    return res.status(401).json({ error: "Label or Street required!" });
  }

  const fileBuffer = req.file ? req.file.buffer : null;
  const originalName = req.file ? req.file.originalname : null;

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
      originalName,
      imageDesc
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

async function fetchAllAddress(req, res, next) {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: "Invalid user" });
  }

  try {
    const addresses = await getAllAddress(userId);

    return res.status(200).json({
      error: false,
      success: true,
      allAddress: addresses,
    });
  } catch (e) {
    return next(e);
  }
}

module.exports = { createAddress, fetchAllAddress };
