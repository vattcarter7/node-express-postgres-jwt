const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

let dbConfig = {};
if (process.env.NODE_ENV === 'production') {
  dbConfig = {
    connectionString: process.env.DATABASE_URL
  };
} else {
  dbConfig = {
    user: 'vattsopheak',
    host: 'localhost',
    database: 'reflection',
    port: 5432
  };
}

console.log(dbConfig);

const pool = new Pool(dbConfig);

module.exports = {
  query(text, params) {
    return new Promise((resolve, reject) => {
      pool
        .query(text, params)
        .then(res => {
          resolve(res);
        })
        .catch(err => {
          reject(err);
        });
    });
  }
};
