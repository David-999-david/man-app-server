require("dotenv").config();
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = function authorizationCheck(req, res, next) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header) {
    const err = new Error("Missing header,authorization");
    err.status = 401;
    return next(err);
  }

  const [schema, token] = header.split(" ");
  if (schema.toLowerCase() !== "bearer" || !token) {
    const err = new Error("Authorization part is not match");
    err.status = 401;
    return next(err);
  }

  jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }, (err, payload) => {
    if (err) {
      err.status = 401;
      return next(err);
    }
    req.userId = payload.userId;
    next();
  });
};
