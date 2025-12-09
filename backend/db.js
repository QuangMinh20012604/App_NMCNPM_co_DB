const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "english_app",
  password: "YOUR_PASSWORD_HERE",
  port: 5432,
});

module.exports = pool;
