const { Pool } = require('pg');
require('dotenv').config(); // .env を読み込む

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Render用：SSL接続（自己署名証明書を許可）
  },
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
