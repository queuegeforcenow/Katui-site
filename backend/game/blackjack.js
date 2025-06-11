const express = require('express');
const db = require('../db');
const rank = require('../rank');
const router = express.Router();

// カードをランダムに引く
function drawCard() {
  const cards = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11]; // J,Q,K = 10, A = 11
  return cards[Math.floor(Math.random() * cards.length)];
}

function calculateTotal(hand) {
  let total = hand.reduce((sum, c) => sum + c, 0);
  let aces = hand.filter(c => c === 11).length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

// POST /api/game/blackjack/play
router.post('/play', async (req, res) => {
  const { userId, bet } = req.body;

  if (!userId || !bet || bet < 100) {
    return res.status(400).json({ message: '不正なリクエスト' });
  }

  try {
    const userRes = await db.query('SELECT balance FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: 'ユーザーが存在しません' });

    const balance = parseInt(userRes.rows[0].balance);
    if (balance < bet) return res.status(400).json({ message: '残高不足' });

    // プレイヤーとディーラーの手札初期化
    const player = [drawCard(), drawCard()];
    const dealer = [drawCard(), drawCard()];

    let playerTotal = calculateTotal(player);
    let dealerTotal = calculateTotal(dealer);

    // プレイヤー自動ロジック（17未満ならヒット）
    while (playerTotal < 17) {
      player.push(drawCard());
      playerTotal = calculateTotal(player);
    }

    // ディーラー自動ロジック（17未満ならヒット）
    while (dealerTotal < 17) {
      dealer.push(drawCard());
      dealerTotal = calculateTotal(dealer);
    }

    // 勝敗判定
    let resultAmount = 0;
    let result = 'lose';
    if (playerTotal > 21) {
      result = 'bust';
    } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
      result = 'win';
      resultAmount = bet * 2;
    } else if (playerTotal === dealerTotal) {
      result = 'draw';
      resultAmount = bet;
    }

    const delta = resultAmount - bet;

    // 残高更新
    await db.query(
      `UPDATE users SET balance = balance + $1 WHERE id = $2`,
      [delta * 1, userId]
    );

    // セッション保存
    const gameRes = await db.query(`SELECT id FROM games WHERE name = 'blackjack'`);
    const gameId = gameRes.rows[0]?.id || 1;

    await db.query(
      `INSERT INTO game_sessions (user_id, game_id, bet_amount, result_amount, session_data)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId,
        gameId,
        bet,
        resultAmount,
        {
          player,
          dealer,
          result,
          playerTotal,
          dealerTotal,
        },
      ]
    );

    // ランク昇格確認
    await rank.checkAndUpdateRank(userId);

    res.json({
      result,
      player,
      dealer,
      playerTotal,
      dealerTotal,
      gained: delta,
    });
  } catch (err) {
    console.error('Blackjack error:', err);
    res.status(500).json({ message: 'エラーが発生しました' });
  }
});

module.exports = router;
