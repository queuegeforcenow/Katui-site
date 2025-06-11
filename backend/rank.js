const db = require('./db');

async function checkAndUpdateRank(userId) {
  try {
    // 累計掛け金を取得
    const betResult = await db.query(
      `SELECT COALESCE(SUM(bet_amount), 0) AS total_bets
       FROM game_sessions
       WHERE user_id = $1`,
      [userId]
    );
    const totalBets = parseInt(betResult.rows[0].total_bets);

    // 現在のランクを取得
    const userResult = await db.query('SELECT rank_id, balance FROM users WHERE id = $1', [userId]);
    const currentRankId = userResult.rows[0].rank_id || 0;
    const currentBalance = parseInt(userResult.rows[0].balance);

    // 現在のランクより上のランクを昇順で取得
    const ranksResult = await db.query(
      `SELECT * FROM ranks WHERE id > $1 AND threshold <= $2 ORDER BY id ASC`,
      [currentRankId, totalBets]
    );

    if (ranksResult.rows.length === 0) return; // 昇格なし

    // 一番上のランクに昇格（ステップアップ）
    const newRank = ranksResult.rows[ranksResult.rows.length - 1];

    // ランク更新 + ボーナス加算
    await db.query('BEGIN');
    await db.query(
      'UPDATE users SET rank_id = $1, balance = balance + $2 WHERE id = $3',
      [newRank.id, newRank.bonus, userId]
    );
    await db.query(
      `INSERT INTO transactions (user_id, amount, type)
       VALUES ($1, $2, 'rank_bonus')`,
      [userId, newRank.bonus]
    );
    await db.query('COMMIT');

    console.log(`User ${userId} promoted to ${newRank.name}, bonus: ¥${newRank.bonus}`);
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Rank update error:', err);
  }
}

module.exports = checkAndUpdateRank;
