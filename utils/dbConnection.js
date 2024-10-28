const mysql = require('mysql2/promise');

const pool = mysql.createPool(process.env.CLEARDB_DATABASE_CONNECTION_URL);

pool.getConnection()
  .then(connection => {
    console.log('Database connection is successful.');
    connection.release();
  })
  .catch(err => {
    console.error('Database connection failed. Error: ' + err.message);
  });

module.exports = pool;