const express = require("express");
const errorHandler = require("./middleware/errorHandler");
require("dotenv").config();
const morgan = require("morgan");
const logger = require("./helper/logger.js");
const pool = require("./db.js");
const cors = require("cors");

const app = express();

app.use(
  morgan(
    ":method :url status=:status :response-time ms - :res[content-length] bytes",
    {
      stream: logger.stream,
    }
  )
);

app.use(express.json());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const PORT = process.env.PORT;

const apiRouter = require("./routes");

app.use("/api", apiRouter);

app.use(errorHandler);

async function checkDataBaseConnection() {
  try {
    const client = await pool.connect();
    client.release();
    console.log("PSQL pool connect successfully!");
    logger.info("PSQL pool connected successfully!");
  } catch (err) {
    console.error("Unable to connect to postgresSQL", err);
  }
}

checkDataBaseConnection().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on ${PORT}`);
  });
});
