require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host : process.env.PGHOST,
    port : parseInt(process.env.PGPORT),
    user : process.env.PGUSER,
    database : process.env.PGDATABASE,
    password : process.env.PGPASSWORD,
    max : 20,
    connectionTimeoutMillis : 3000
});

pool.on('error',(err)=>{
    console.log('Error on connection with pg',err)
});

module.exports = pool;