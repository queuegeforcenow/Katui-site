const express = require('express');
const app = express();
const pg = require('pg');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// DB接続設定
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ミドルウェア
app.use(cors());
app.use(express.json());

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// シンプルなルートテスト
app.get('/', (req, res) => {
  res.send('Hello from backend!');
});

// TODO: ここに auth / user / game などのルーティングを追加します

// サーバースタート
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
