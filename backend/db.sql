-- db.sql: 初期テーブル構成

-- 1. usersテーブル
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  balance BIGINT DEFAULT 0 NOT NULL,
  rank_id INT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. ranksテーブル
CREATE TABLE ranks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  threshold BIGINT NOT NULL,
  bonus BIGINT NOT NULL
);

-- 初期ランクデータ
INSERT INTO ranks (name, threshold, bonus) VALUES
('なし', 0, 0),
('ブロンズ', 100000, 4000),
('シルバー', 1000000, 10000),
('ゴールド', 5000000, 50000),
('プラチナ1', 10000000, 100000),
('プラチナ2', 20000000, 200000),
('プラチナ3', 30000000, 300000),
('プラチナ4', 50000000, 500000),
('プラチナ5', 70000000, 700000),
('ダイヤモンド1', 100000000, 1000000),
('ダイヤモンド2', 200000000, 2000000),
('ダイヤモンド3', 300000000, 3000000),
('ダイヤモンド4', 400000000, 4000000),
('ダイヤモンド5', 500000000, 5000000);

ALTER TABLE users
  ADD CONSTRAINT fk_rank
  FOREIGN KEY (rank_id) REFERENCES ranks(id);

-- 3. transactionsテーブル
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  amount BIGINT NOT NULL,
  type VARCHAR(50) NOT NULL,
  related_user_id INT,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (related_user_id) REFERENCES users(id)
);

-- 4. gamesテーブル
CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  description TEXT
);

-- 5. game_sessionsテーブル
CREATE TABLE game_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  game_id INT NOT NULL,
  bet_amount BIGINT NOT NULL,
  result_amount BIGINT NOT NULL,
  session_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (game_id) REFERENCES games(id)
);

-- 6. work_rewardsテーブル
CREATE TABLE work_rewards (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  rewarded_amount BIGINT NOT NULL,
  rewarded_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 7. chips_transfersテーブル
CREATE TABLE chips_transfers (
  id SERIAL PRIMARY KEY,
  from_user_id INT NOT NULL,
  to_user_id INT NOT NULL,
  amount BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id) REFERENCES users(id)
);
