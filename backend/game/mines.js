const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../auth");

// ランダムな爆弾配置を生成
function generateBombs(gridSize, bombCount) {
  const positions = new Set();
  while (positions.size < bombCount) {
    const pos = Math.floor(Math.random() * gridSize);
    positions.add(pos);
  }
  return Array.from(positions);
}

// プレイヤーの選択が爆弾かどうかを判定
function isBombSelected(bombs, selectedIndex) {
  return bombs.includes(selectedIndex);
}

// 掛け金に応じた配当倍率（簡易バージョン）
function getMultiplier(successCount) {
  const table = [
    1.3, 1.6, 2.1, 2.8, 3.5, 5, 8, 13, 20, 30, 50, 80, 120, 200, 400, 800, 1500,
    3000, 5000, 10000, 20000, 50000, 100000
  ];
  return table[Math.min(successCount, table.length - 1)];
}

// Minesゲームスタート：爆弾配置返す
router.post("/start", authMiddleware, async (req, res) => {
  const { betAmount, bombCount } = req.body;
  const userId = req.user.id;

  if (betAmount <= 0 || bombCount < 1 || bombCount >= 25) {
    return res.status(400).json({ error: "無効な入力です。" });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const userRes = await client.query("SELECT balance FROM users WHERE id = $1 FOR UPDATE", [userId]);
    const balance = userRes.rows[0].balance;
    if (balance < betAmount) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "残高が不足しています。" });
    }

    const bombs = generateBombs(25, bombCount);
    const sessionData = {
      bombs,
      selections: [],
      state: "playing",
      betAmount,
      bombCount,
    };

    const gameRes = await client.query("SELECT id FROM games WHERE name = 'Mines'");
    const gameId = gameRes.rows[0]?.id;

    const insertSession = await client.query(
      `INSERT INTO game_sessions (user_id, game_id, bet_amount, result_amount, session_data)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, gameId, betAmount, 0, sessionData]
    );

    // 残高を引く
    await client.query("UPDATE users SET balance = balance - $1 WHERE id = $2", [betAmount, userId]);

    await client.query("COMMIT");
    res.json({ sessionId: insertSession.rows[0].id });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).json({ error: "サーバーエラー" });
  } finally {
    client.release();
  }
});

// セルを開ける（爆弾か確認）
router.post("/reveal", authMiddleware, async (req, res) => {
  const { sessionId, index } = req.body;
  const userId = req.user.id;

  const client = await db.connect();
  try {
    const sessionRes = await client.query(
      "SELECT * FROM game_sessions WHERE id = $1 AND user_id = $2",
      [sessionId, userId]
    );
    const session = sessionRes.rows[0];
    if (!session || session.result_amount > 0) {
      return res.status(400).json({ error: "無効なセッション" });
    }

    const data = session.session_data;
    if (data.state !== "playing") {
      return res.status(400).json({ error: "ゲーム終了済み" });
    }

    if (data.selections.includes(index)) {
      return res.status(400).json({ error: "既に選択済み" });
    }

    if (isBombSelected(data.bombs, index)) {
      data.state = "lost";
      await client.query(
        "UPDATE game_sessions SET session_data = $1, updated_at = NOW() WHERE id = $2",
        [data, sessionId]
      );
      return res.json({ result: "爆弾", lost: true });
    }

    data.selections.push(index);
    await client.query(
      "UPDATE game_sessions SET session_data = $1, updated_at = NOW() WHERE id = $2",
      [data, sessionId]
    );
    res.json({ result: "セーフ", selections: data.selections });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "エラー" });
  } finally {
    client.release();
  }
});

// キャッシュアウト（賞金をもらう）
router.post("/cashout", authMiddleware, async (req, res) => {
  const { sessionId } = req.body;
  const userId = req.user.id;

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const sessionRes = await client.query(
      "SELECT * FROM game_sessions WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [sessionId, userId]
    );
    const session = sessionRes.rows[0];
    if (!session) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "セッションが存在しません" });
    }

    const data = session.session_data;
    if (data.state !== "playing") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "既に終了しています" });
    }

    const multiplier = getMultiplier(data.selections.length);
    const reward = Math.floor(data.betAmount * multiplier);
    data.state = "cashed";
    session.result_amount = reward;

    await client.query(
      `UPDATE game_sessions SET session_data = $1, result_amount = $2, updated_at = NOW()
       WHERE id = $3`,
      [data, reward, sessionId]
    );
    await client.query(
      "UPDATE users SET balance = balance + $1 WHERE id = $2",
      [reward, userId]
    );
    await client.query("COMMIT");

    res.json({ reward, multiplier });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).json({ error: "キャッシュアウト失敗" });
  } finally {
    client.release();
  }
});

module.exports = router;
