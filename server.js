const express = require("express");
const errorHandler = require("./middleware/errorHandler");
require("dotenv").config();
const pool = require("./db.js");

const app = express();

app.use(express.json());

const PORT = process.env.PORT;

const authRoute = require("./routes/userRoutes.js");

app.use("/api", authRoute);

app.use(errorHandler);

async function checkDataBaseConnection() {
  try {
    const client = await pool.connect();
    client.release();
    console.log("PSQL pool connect successfully!");
  } catch (err) {
    console.error("Unable to connect to postgresSQL", err);
  }
}

checkDataBaseConnection().then(() =>{
  app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
});
