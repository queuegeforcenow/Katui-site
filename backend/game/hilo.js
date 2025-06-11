const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../auth");

// トランプの数字（1〜13）をランダム生成（スート無視）
function drawCard() {
  return Math.floor(Math.random() * 13) + 1;
}

// 配当倍率のテーブル（連勝数に応じて増加）
function getMultiplier(correctCount) {
  const table = [
    1.3, 1.5, 1.8, 2.2, 2.7, 3.5, 4.5, 6, 8, 10, 15, 20, 30
  ];
  return table[Math.min(correctCount, table.length - 1)];
}

// ゲーム開始（初期カードドロー、セッション作成）
router.post("/start", authMiddleware, async (req, res) => {
  const { betAmount } = req.body;
  const userId = req.user.id;

  if (betAmount <= 0) return res.status(400).json({ error: "無効な掛け金です。" });

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // 残高チェック・ロック
    const userRes = await client.query("SELECT balance FROM users WHERE id=$1 FOR UPDATE", [userId]);
    const balance = userRes.rows[0].balance;
    if (balance < betAmount) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "残高不足です。" });
    }

    const initialCard = drawCard();

    const gameRes = await client.query("SELECT id FROM games WHERE name='Hilo'");
    const gameId = gameRes.rows[0]?.id;

    const sessionData = {
      state: "playing",
      betAmount,
      currentCard: initialCard,
      correctGuesses: 0,
      history: [],
    };

    const insertRes = await client.query(
      `INSERT INTO game_sessions (user_id, game_id, bet_amount, result_amount, session_data)
       VALUES ($1,$2,$3,0,$4) RETURNING id`,
      [userId, gameId, betAmount, sessionData]
    );

    // 残高減少
    await client.query("UPDATE users SET balance=balance-$1 WHERE id=$2", [betAmount, userId]);

    await client.query("COMMIT");
    res.json({ sessionId: insertRes.rows[0].id, currentCard: initialCard });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).json({ error: "ゲーム開始エラー" });
  } finally {
    client.release();
  }
});

// プレイヤーの予想を判定
// guess: "higher" or "lower"
router.post("/guess", authMiddleware, async (req, res) => {
  const { sessionId, guess } = req.body;
  const userId = req.user.id;

  if (!["higher", "lower"].includes(guess)) {
    return res.status(400).json({ error: "予想は'higher'か'lower'である必要があります。" });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const sessionRes = await client.query("SELECT * FROM game_sessions WHERE id=$1 AND user_id=$2 FOR UPDATE", [sessionId, userId]);
    const session = sessionRes.rows[0];
    if (!session) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "セッションが存在しません。" });
    }

    const data = session.session_data;
    if (data.state !== "playing") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "ゲームは終了しています。" });
    }

    const newCard = drawCard();
    const currentCard = data.currentCard;

    let correct = false;
    if (guess === "higher" && newCard > currentCard) correct = true;
    else if (guess === "lower" && newCard < currentCard) correct = true;
    else if (newCard === currentCard) {
      // 引き分けは負け扱いにするか、続行にするかルール次第。ここでは負け扱い。
      correct = false;
    }

    if (!correct) {
      data.state = "lost";
      data.history.push({ guess, currentCard, newCard, result: "lose" });
      await client.query("UPDATE game_sessions SET session_data=$1, result_amount=0, updated_at=NOW() WHERE id=$2", [data, sessionId]);
      await client.query("COMMIT");
      return res.json({ result: "lose", newCard });
    }

    // 正解の場合
    data.correctGuesses++;
    data.currentCard = newCard;
    data.history.push({ guess, currentCard, newCard, result: "win" });

    await client.query("UPDATE game_sessions SET session_data=$1, updated_at=NOW() WHERE id=$2", [data, sessionId]);
    await client.query("COMMIT");

    res.json({ result: "win", newCard, correctGuesses: data.correctGuesses });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).json({ error: "エラーが発生しました。" });
  } finally {
    client.release();
  }
});

// キャッシュアウト（賞金獲得）
router.post("/cashout", authMiddleware, async (req, res) => {
  const { sessionId } = req.body;
  const userId = req.user.id;

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const sessionRes = await client.query("SELECT * FROM game_sessions WHERE id=$1 AND user_id=$2 FOR UPDATE", [sessionId, userId]);
    const session = sessionRes.rows[0];
    if (!session) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "セッションがありません。" });
    }

    const data = session.session_data;
    if (data.state !== "playing") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "すでにゲーム終了済みです。" });
    }

    const multiplier = getMultiplier(data.correctGuesses);
    const reward = Math.floor(data.betAmount * multiplier);

    data.state = "cashed";
    session.result_amount = reward;

    await client.query(
      "UPDATE game_sessions SET session_data=$1, result_amount=$2, updated_at=NOW() WHERE id=$3",
      [data, reward, sessionId]
    );
    await client.query(
      "UPDATE users SET balance=balance+$1 WHERE id=$2",
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
