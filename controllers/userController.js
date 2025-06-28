require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db.js");
const logger = require("../helper/logger.js");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { error } = require("console");

const JWT_SECRET = process.env.JWT_SECRET;
const EXPIRE_IN = parseInt(process.env.JWT_EXPIRE_IN, 10);
const SALT_ROUND = (process.env.BCRYPT_SALT_ROUNDS, 10);

const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const REFRESH_TOKEN_EXPIRES_IN = parseInt(
  process.env.REFRESH_TOKEN_EXPIRES_IN,
  10
);

const RESET_EXPIRE_IN = parseInt(process.env.RESET_EXPIRE_IN, 10);

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
      logger.log("Fields are required : status=401");
      return res.status(401).json({ error: "Feilds are required" });
    }

    const emailExist = await pool.query(
      "select id from users where email = $1",
      [email]
    );
    if (emailExist.rows.length > 0) {
      logger.info("Email had already taken! : status=401");
      return res.status(401).json({ error: "Email had already taken!" });
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

    return res.status(201).json({
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
      logger.info(`Email not match : status=401`);
      return res.status(401).json({ error: "Email does not exist" });
    }

    const user = result.rows[0];

    const userId = user.id;

    const matchPass = await bcrypt.compare(password, user.password);

    if (!matchPass) {
      logger.info(`Incorrect password : status=401`);
      return res.status(401).json({ error: "Incorrect password" });
    }

    await pool.query(
      `
      update users set last_login_at = now() where id=$1
      `,
      [userId]
    );

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
      return res.status(400).json({ error: "Refresh token is required" });
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

    const newRefresh = await generateRefreshToken(payload.userId);

    res.status(201);
    logger.info(`Refresh success => status=${res.statusCode}`);
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
    if (err.name == "TokenExpiredError") {
      return res.status(401).json({ error: "jwt expired" });
    }
    if (err.name == "JsonWebTokenError") {
      return res.status(401).json({ error: "jwt malformed" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function getUserProfile(req, res, next) {
  try {
    const userId = req.userId;
    logger.info(`GET /api/me - Request receive: userId=${userId}`);

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

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

function generateOptRandom() {
  const min = 100_000;
  const max = 900_000;
  const num = crypto.randomInt(min, max);
  return num.toString();
}

async function emailRequestOtp(req, res, next) {
  const { email } = req.body;

  if (email === null) {
    logger.info("Required email status=401");
    return res.status(401).json({ error: "Email is required" });
  }

  const userRes = await pool.query(`select id from users where email=$1`, [
    email,
  ]);

  if (userRes.rows.length === 0) {
    logger.info(`User with ${email} does not exist : status=401`);
    return res.status(401).json({ error: "Email does not exist" });
  }

  const userId = userRes.rows[0].id;
  const randomOtp = generateOptRandom();
  const hashOtp = await bcrypt.hash(randomOtp, 10);
  const expires_in = new Date(Date.now() + 10 * 60 * 1000);

  await pool.query(
    `insert into password_reset_opt (user_id,otp_hash,expires_at)
    values ($1,$2,$3)
    on conflict (user_id)
    do update set otp_hash = Excluded.otp_hash,
                  expires_at = Excluded.expires_at,
                  used = false
    `,
    [userId, hashOtp, expires_in]
  );

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: +process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: "没有油小墨水 <dontgun54@gmail.com>",
    to: email,
    subject: "Your password reset code",
    html: `
    <p>Your password reset code is:</p>
    <h2>${randomOtp}</h2>
    <p>It expires in 10 minutes.</p>
    `,
  });

  logger.info(`An OTP is send to ${email} status=201`);
  return res.status(200).json({
    message: "If that email is registered, you'll recevie an OTP",
  });
}

async function verifyOtp(req, res, next) {
  const { otp, email } = req.body;

  if (email === null) {
    logger.info("Invalid email : status=401");
    return res.status(401).json({ error: "Invalid email" });
  }

  if (otp === null) {
    logger.info("User input of otp is empty : status=401");
    return res.status(401).json({ error: "Otp is empty" });
  }

  try {
    const usersRes = await pool.query(`select id from users where email=$1 `, [
      email,
    ]);

    if (usersRes.rows.length === 0) {
      logger.info("Can't find user, status=401");
      return res.status(401).json({ error: "Cannot find the user" });
    }

    const userId = usersRes.rows[0].id;

    const optRes = await pool.query(
      `select id,otp_hash,expires_at,used from password_reset_opt
    where user_id = $1
    `,
      [userId]
    );

    if (optRes.rows.length === 0) {
      logger.info("Can't find user, status=400");
      return res.status(400).json({ error: "Cannot find the user" });
    }

    const { id: otpId, otp_hash, expires_at, used } = optRes.rows[0];

    if (used) {
      logger.info(`This opt ${otp} already had been used`);
      return res
        .status(400)
        .json({ error: `This opt ${otp} already had been used` });
    }

    if (new Date(expires_at) < new Date()) {
      logger.info(`This otp ${otp} is expires, status=400`);
      return res.status(400).json({ error: `This otp ${otp} is expires` });
    }

    const match = await bcrypt.compare(otp, otp_hash);

    if (!match) {
      logger.info("OTP is not match");
      return res.status(401).json({ error: "Otp is not match" });
    }

    await pool.query(`update password_reset_opt set used = true where id=$1`, [
      otpId,
    ]);

    const resetToken = jwt.sign(
      { userId, purpose: "reset" },
      process.env.RESET_SECRET,
      { expiresIn: RESET_EXPIRE_IN }
    );

    return res
      .status(200)
      .json({ message: "Verify-otp success.", resetToken: resetToken });
  } catch (e) {
    logger.error("Server error : status=500 ", e);
    return res.status(500).json({ error: "Server error." });
  }
}

async function resetPassword(req, res, next) {
  const { resetToken, newPsw } = req.body;

  if (!resetToken) {
    logger.info("Reset Token is missing, status=401");
    return res.status(401).json({ error: "Reset Token is missing" });
  }
  if (newPsw == null) {
    logger.info("New password is required, status=401");
    return res.status(401).json({ error: "New password is required" });
  }
  if (newPsw.length < 6) {
    logger.info("Password length less than 6 : status=401");
    return res.status(401).json({ error: "Password length less than 6" });
  }

  let payload;
  try {
    payload = jwt.verify(resetToken, process.env.RESET_SECRET);

    if (payload.purpose !== "reset") {
      return res.status(401).json({ error: "Invalid token reset" });
    }

    const userId = payload.userId;

    const hashPsw = await bcrypt.hash(newPsw, 10);

    await pool.query(
      `
      update users
      set password = $1,
      refresh_token = Null,
      refresh_token_expires_at = now()
      where id = $2
      `,
      [hashPsw, userId]
    );

    await pool.query(
      `
      delete from password_reset_opt where user_id=$1
      `,
      [userId]
    );

    logger.info("Password reset success : status=200");
    return res.status(200).json({ message: "Password reset success" });
  } catch (e) {
    if (e.name === "TokenExpiredError" || e.name === "JsonWebTokenError") {
      logger.error("Invalid or expired reset token : status=401");
      return res.status(401).json({ error: "Invalid or expired reset token" });
    }
    logger.info("Server error : status=500");
    return res.status(500).json({ error: "Server error" });
  }
}

module.exports = {
  signIn,
  signUp,
  refreshAccessToken,
  getUserProfile,
  emailRequestOtp,
  verifyOtp,
  resetPassword,
};
