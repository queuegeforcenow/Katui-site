const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// モジュール読み込み
const authRoutes = require('./backend/auth');
const rankRoutes = require('./backend/rank');
const workRoutes = require('./backend/work');
const adminRoutes = require('./backend/admin');
const blackjackRoutes = require('./backend/game/blackjack');
const hiloRoutes = require('./backend/game/hilo');
const minesRoutes = require('./backend/game/mines');

// .env 読み込み
dotenv.config();

// アプリ初期化
const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静的ファイル（HTML/JS/CSSなど）
app.use(express.static(path.join(__dirname, 'public')));

// APIルート
app.use('/api/auth', authRoutes);         // ログイン、登録、ユーザー情報取得
app.use('/api/rank', rankRoutes);    // ランク更新・昇格処理
app.use('/api/work', workRoutes);    // work報酬処理
app.use('/api/admin', adminRoutes);  // 管理者操作（削除・残高操作）
app.use('/api/games/blackjack', blackjackRoutes);
app.use('/api/games/hilo', hiloRoutes);
app.use('/api/games/mines', minesRoutes);

// ルート確認（Renderなどで動作確認用）
app.get('/api/ping', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// フロントエンドのルーティングを許容（直接URL指定しても表示されるように）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 起動
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
