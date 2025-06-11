const express = require('express');
const router = express.Router();
const db = require('./db');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// 管理者認証ミドルウェア
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    if (!decoded.is_admin) return res.status(403).json({ error: 'Forbidden' });

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ✅ ユーザー削除
router.delete('/delete/:id', requireAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  try {
    const result = await db.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Deletion failed' });
  }
});

// ✅ ユーザー残高変更
router.post('/balance', requireAdmin, async (req, res) => {
  const { user_id, new_balance } = req.body;
  try {
    await db.query('UPDATE users SET balance = $1 WHERE id = $2', [new_balance, user_id]);
    res.json({ message: 'Balance updated' });
  } catch (err) {
    res.status(500).json({ error: 'Balance update failed' });
  }
});

module.exports = router;
