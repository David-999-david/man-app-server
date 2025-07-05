const {
  addAddress,
  getAllAddress,
  updateAddress,
  removeAddress,
} = require("../services/addressService");

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

async function editAddress(req, res, next) {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: "Invalid user" });
  }

  const addressId = req.params.id;

  if (!addressId) {
    return res.status(401).json({ error: "Address id missing or error " });
  }

  const { label, street, city, state, country, postalCode, imageDesc } =
    req.body;

  const fileBuffer = req.file ? req.file.buffer : null;
  const originalName = req.file ? req.file.originalname : null;

  try {
    const updatedAddress = await updateAddress(
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
    );

    return res.status(200).json({
      error: false,
      success: true,
      data: updatedAddress,
    });
  } catch (e) {
    return next(e);
  }
}

async function deleteAddress(req, res, next) {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: "Invalid user" });
  }

  const addressId = req.params.id;

  if (!addressId) {
    return res.status(401).json({ error: `Can't find address with id=${id}` });
  }

  try {
    await removeAddress(userId, addressId);

    return res.status(200).json({
      error: false,
      success: true,
      message: "Delete successfully",
    });
  } catch (e) {
    return next(e);
  }
}

module.exports = { createAddress, fetchAllAddress, editAddress, deleteAddress };
