const { Pool } = require('pg');

const dotenv = require('dotenv');

dotenv.config();

const logQuery = (sql, params) => {
  console.log('BEGIN-----------------------------------');
  console.log('SQL: ', sql);
  console.log('PARAMS: ', JSON.stringify(params));
  console.log('END-------------------------------------');
};


let dbConfig = {};

if (process.env.NODE_ENV === 'production') {
  dbConfig = {
    connectionString: process.env.DATABASE_URL
  };
} else {
  dbConfig = {
    user: 'vattsopheak',
    host: 'localhost',
    database: 'hackerbook',
    port: 5432
  };
}

const pool = new Pool(dbConfig);

module.exports = {
  query(sql, params) {
    logQuery(sql, params);
    return new Promise((resolve, reject) => {
      pool
        .query(sql, params)
        .then(res => {
          resolve(res);
        })
        .catch(err => {
          reject(err);
        });
    });
  }
};
