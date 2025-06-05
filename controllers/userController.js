require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db.js");

const JWT_SECRET = process.env.JWT_SECRET;
const EXPRIE_IN = process.env.JWT_EXPIRE_IN;
const SALT_ROUND = parseInt(process.env.BCRYPT_SALT_ROUNDS);

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: EXPRIE_IN });
}

async function signUp(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      const err = new Error("Email and password are required!");
      err.status = 400;
      throw err;
    }

    const emailExist = await pool.query(
      "select id from users where email = $1",
      [email]
    );
    if (emailExist.rows.length > 0) {
      const err = new Error("Email had already taken!");
      err.status = 409;
      throw err;
    }

    const hashPassword = await bcrypt.hash(password, SALT_ROUND);

    const result = await pool.query(
      "insert into users (name,email,password) values ($1,$2,$3) returning id",
      [name, email, hashPassword]
    );

    const newUserId = result.rows[0].id;

    const token = generateToken(newUserId);

    console.log(`New user created => ${newUserId} ${email}`);

    res.status(201).json({ token, message: "Register successfully!" });
  } catch (err) {
    next(err);
  }
}

async function signIn(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const err = new Error("Email and password are required!");
      err.status = 400;
      throw err;
    }

    const result = await pool.query(
      "select id,password from users where email = $1",
      [email]
    );
    if (result.rows.length === 0) {
      const err = new Error("Invalid credentials.");
      err.status = 401;
      throw err;
    }

    const user = result.rows[0];

    const matchPass = await bcrypt.compare(password, user.password);

    if (!matchPass) {
      const err = new Error("Password is incorrect!");
      err.status = 401;
      throw err;
    }

    const token = generateToken(user.id);
    res.json({ token });
  } catch (err) {
    next(err);
  }
}

async function getUserProfile(req, res, next) {
  try {
    const userId = req.userId;

    if (!userId) {
      const err = new Error("no user id in request!");
      err.status = 401;
      throw err;
    }

    const result = await pool.query(
      "select id,name,email,created_at from users where id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      const err = new Error("User not fuound!");
      err.status = 404;
      throw err;
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signIn,
  signUp,
  getUserProfile,
};
