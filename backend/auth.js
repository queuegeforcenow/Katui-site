const express = require('express');
const bcrypt = require('bcrypt');
const db = require('./db');
const crypto = require('crypto');

const router = express.Router();

// ランダムなユーザー名を生成（英数字8文字）
function generateUsername() {
  return crypto.randomBytes(4).toString('hex');
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 4) {
    return res.status(400).json({ message: 'パスワードは4文字以上必要です。' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const username = generateUsername();

  try {
    const result = await db.query(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       RETURNING id, username, balance, is_admin`,
      [username, hashedPassword]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: '登録に失敗しました。' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'ユーザーが見つかりません。' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'パスワードが違います。' });
    }

    // 認証済みユーザー情報（最低限）
    res.json({
      id: user.id,
      username: user.username,
      balance: user.balance,
      is_admin: user.is_admin,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'ログインに失敗しました。' });
  }
});

// GET /api/auth/me?id=xxx
router.get('/me', async (req, res) => {
  const { id } = req.query;
  try {
    const result = await db.query(
      `SELECT id, username, balance, is_admin, rank_id FROM users WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ユーザーが見つかりません。' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Auth/me error:', err);
    res.status(500).json({ message: '情報取得に失敗しました。' });
  }
});

module.exports = router;
