const fs = require("fs");
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === "true"
    ? {
        ca: fs.readFileSync(
          "/etc/pki/tls/certs/rds-global-bundle.pem",
          "utf8"
        ),
        rejectUnauthorized: true,
      }
    : false,
});

module.exports = pool;