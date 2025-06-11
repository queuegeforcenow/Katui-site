const db = require("../db");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const SALT_ROUNDS = 10;

// ランダムなユーザーネーム生成
function generateRandomUsername(length = 8) {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

class User {
  // ユーザー作成（usernameはオプションで、なければランダム生成）
  static async create({ username, password, isAdmin = false }) {
    if (!username) {
      username = generateRandomUsername(8);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const sql = `
      INSERT INTO users (username, password_hash, is_admin)
      VALUES ($1, $2, $3)
      RETURNING id, username, balance, rank_id, is_admin, created_at
    `;
    const values = [username, passwordHash, isAdmin];
    const { rows } = await db.query(sql, values);
    return rows[0];
  }

  // ユーザー名から取得
  static async findByUsername(username) {
    const { rows } = await db.query(
      `SELECT id, username, password_hash, balance, rank_id, is_admin FROM users WHERE username=$1`,
      [username]
    );
    return rows[0];
  }

  // IDから取得
  static async findById(id) {
    const { rows } = await db.query(
      `SELECT id, username, balance, rank_id, is_admin FROM users WHERE id=$1`,
      [id]
    );
    return rows[0];
  }

  // パスワード検証
  static async verifyPassword(user, password) {
    return await bcrypt.compare(password, user.password_hash);
  }

  // 残高変更（amountは増減どちらも可）
  static async updateBalance(userId, amount) {
    const sql = `UPDATE users SET balance = balance + $1, updated_at=NOW() WHERE id = $2 RETURNING balance`;
    const { rows } = await db.query(sql, [amount, userId]);
    return rows[0];
  }

  // ユーザー削除（管理者用）
  static async deleteUser(userId) {
    const sql = `DELETE FROM users WHERE id=$1`;
    await db.query(sql, [userId]);
  }
}

module.exports = User;
