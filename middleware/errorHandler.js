const logger = require("../helper/logger");

module.exports = function errorHandler(err, req, res, next) {
  console.error(err.stack);
  logger.info(`Error: ${err.message},${err.stack}`);

  const statusCode = err.status || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    error: message,
  });
};
