const { createLogger, transports, format } = require("winston");
const colors = require("colors/safe");

const httpPrintf = format.printf(({ timestamp, level, message }) => {
  const greyTs = colors.grey(timestamp);
  const msg = message
    .replace(/userId=(\d+)/g, (_, id) => `userId=${colors.cyan(id)}`)
    .replace(
      /status=([A-Za-z0-9_]+)/g,
      (_, st) => `status=${colors.yellow(st)}`
    );

  return `${greyTs} [${level.toUpperCase()}] : ${msg}`;
});

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    httpPrintf
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.colorize({
          all: true,
          colors: {
            info: "green",
            error: "red",
            warn: "yellow",
            debug: "blue",
          },
        })
      ),
    }),
    new transports.File({
      filename: "logs/app.log",
      format: format.combine(),
    }),
  ],
});

logger.stream = {
  write: (msg) => {
    logger.info(msg.trim());
  },
};

module.exports = logger;
