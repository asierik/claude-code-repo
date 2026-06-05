import { db } from '../db/connection.js';

export const sessionRepository = {
  create(token, userId, createdAt) {
    db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(
      token,
      userId,
      createdAt
    );
  },

  findUserIdByToken(token) {
    const row = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token);
    return row ? row.user_id : null;
  },

  delete(token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  },
};
