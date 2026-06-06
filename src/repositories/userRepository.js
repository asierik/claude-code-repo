import { get, run } from '../db/connection.js';

export const userRepository = {
  async findByUsername(username) {
    return (await get('SELECT * FROM users WHERE username = ?', [username])) || null;
  },

  async findById(id) {
    return (await get('SELECT id, username FROM users WHERE id = ?', [id])) || null;
  },

  async existsByUsername(username) {
    return !!(await get('SELECT 1 FROM users WHERE username = ?', [username]));
  },

  async create({ username, passHash, salt, createdAt }) {
    const info = await run('INSERT INTO users (username, pass_hash, salt, created_at) VALUES (?, ?, ?, ?)', [
      username,
      passHash,
      salt,
      createdAt,
    ]);
    return Number(info.lastInsertRowid ?? 0);
  },
};
