const mysql = require('mysql2/promise');

const pool = mysql.createPool(process.env.MYSQL_URL, {
  waitForConnections: true,
  connectionLimit: 10,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;