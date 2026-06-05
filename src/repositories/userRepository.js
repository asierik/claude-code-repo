import { db } from '../db/connection.js';

export const userRepository = {
  findByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username) || null;
  },

  findById(id) {
    return db.prepare('SELECT id, username FROM users WHERE id = ?').get(id) || null;
  },

  existsByUsername(username) {
    return !!db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
  },

  create({ username, passHash, salt, createdAt }) {
    const info = db
      .prepare('INSERT INTO users (username, pass_hash, salt, created_at) VALUES (?, ?, ?, ?)')
      .run(username, passHash, salt, createdAt);
    return Number(info.lastInsertRowid);
  },
};
