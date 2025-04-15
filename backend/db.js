const mysql = require('mysql2');

const db = mysql.createConnection({
  host: "interchange.proxy.rlwy.net",
  user: "root",
  password: "qSDBRCWrXstTUfvLyFMCSjldWIkPGfRo",
  database: "game_list_db"
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed: ' + err.stack);
    return;
  }
  console.log('Connected to MySQL database.');
});

module.exports = db;
