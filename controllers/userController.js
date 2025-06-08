require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db.js");

const JWT_SECRET = process.env.JWT_SECRET;
const EXPIRE_IN = process.env.JWT_EXPIRE_IN;
const SALT_ROUND = (process.env.BCRYPT_SALT_ROUNDS, 10);

const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const REFRESH_TOKEN_EXPIRES_IN = parseInt(
  process.env.REFRESH_TOKEN_EXPIRES_IN,
  10
);

function generateAccessToken(userId) {
  return jwt.sign({ userId, purpose: "access" }, JWT_SECRET, {
    expiresIn: EXPIRE_IN,
  });
}

async function generateRefreshToken(userId) {
  const refreshToken = jwt.sign(
    { userId, purpose: "refresh" },
    REFRESH_TOKEN,

    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

  await pool.query(
    `update users
    set refresh_token = $1,
    refresh_token_expires_at = NOW() + ( $2 * INTERVAL '1 second' )
    where id = $3
    `,
    [refreshToken, REFRESH_TOKEN_EXPIRES_IN, userId]
  );

  return refreshToken;
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
      "insert into users (name,email,password) values ($1,$2,$3) returning id, email , created_at",
      [name, email, hashPassword]
    );

    const newUser = result.rows[0];

    const newUserId = newUser.id;

    const accessToken = generateAccessToken(newUserId);

    const refreshToken = await generateRefreshToken(newUserId);

    console.log(`New user created => ${newUserId} ${email}`);

    res.status(201).json({
      success: true,
      data: {
        accessToken: accessToken,
        expires_in: parseInt(process.env.EXPIRE_IN),
        id: newUserId,
        name: newUser.name,
        refreshToken: refreshToken,
        refreshtokenExpiresAt: parseInt(
          process.env.REFRESH_TOKEN_EXPIRES_IN,
          10
        ),
        createAt: newUser.created_at,
      },
    });
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
      "select id,name, email, password, created_at from users where email = $1",
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

    const accessToken = generateAccessToken(user.id);

    const refreshToken = await generateRefreshToken(user.id);

    res.json({
      success: true,
      data: {
        accessToken: accessToken,
        expiresIn: parseInt(process.env.EXPIRE_IN),
        refreshToken: refreshToken,
        refreshtokenExpiresAt: parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN),
        name: user.name,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function refreshAccessToken(req, res, next) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      const err = new Error("Refresh Token is missing");
      err.status = 401;
      throw err;
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN);
    } catch (jwtErr) {
      jwtErr.status = 401;
      return next(jwtErr);
    }

    const userId = payload.userId;

    const userRes = await pool.query(
      `select refresh_token_expires_at from users where Id = $1 and refresh_token = $2`,
      [userId, refreshToken]
    );

    if (userRes.rows.length === 0) {
      const e = new Error("Refresh token not found in this user");
      e.status = 401;
      throw e;
    }

    const { refreshtokenExpiresAt } = userRes.rows[0];

    if (refreshtokenExpiresAt < new Date()) {
      const e = new Error("Refresh Token is expired!");
      e.status = 401;
      throw e;
    }

    const newAccess = generateAccessToken(payload.userId);

    const newRefresh = generateRefreshToken(payload.userId);

    return res.status(201).json({
      success: true,
      newAccess: newAccess,
      expiresIn: parseInt(process.env.EXPIRE_IN),
      newRefresh: newRefresh,
      refrerefreshtokenExpiresAt: parseInt(
        process.env.REFRESH_TOKEN_EXPIRES_IN
      ),
    });
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

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signIn,
  signUp,
  refreshAccessToken,
  getUserProfile,
};
