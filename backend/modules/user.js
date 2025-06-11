const db = require('../db');
const bcrypt = require('bcrypt');

async function createUser(password) {
  const username = `user_${Math.random().toString(36).substring(2, 8)}`;
  const hash = await bcrypt.hash(password, 10);
  const result = await db.query(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *',
    [username, hash]
  );
  return result.rows[0];
}

async function findUserByUsername(username) {
  const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
  return result.rows[0];
}

async function findUserById(id) {
  const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
}

module.exports = {
  createUser,
  findUserByUsername,
  findUserById,
};
