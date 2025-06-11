const express = require('express');
const router = express.Router();
const db = require('./db');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// ミドルウェア：認証
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ランダム報酬（200〜5000円）、1時間制限
router.post('/', requireAuth, async (req, res) => {
  const userId = req.user.id;

  try {
    // 最後の報酬取得時間を確認
    const { rows } = await db.query(
      'SELECT rewarded_at FROM work_rewards WHERE user_id = $1 ORDER BY rewarded_at DESC LIMIT 1',
      [userId]
    );

    const now = new Date();
    if (rows.length > 0) {
      const lastRewarded = new Date(rows[0].rewarded_at);
      const diffInMs = now - lastRewarded;
      if (diffInMs < 60 * 60 * 1000) {
        const minutesLeft = Math.ceil((60 * 60 * 1000 - diffInMs) / 60000);
        return res.status(429).json({ error: `あと${minutesLeft}分待ってください。` });
      }
    }

    // ランダム金額生成（200〜5000）
    const amount = Math.floor(Math.random() * (5000 - 200 + 1)) + 200;

    // 残高加算、報酬記録
    await db.query('BEGIN');
    await db.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [amount, userId]);
    await db.query(
      'INSERT INTO work_rewards (user_id, rewarded_amount) VALUES ($1, $2)',
      [userId, amount]
    );
    await db.query('COMMIT');

    res.json({ message: '報酬を獲得しました！', amount });
  } catch (err) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: '報酬処理中にエラーが発生しました。' });
  }
});

module.exports = router;
