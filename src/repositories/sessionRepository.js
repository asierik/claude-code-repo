import { get, run } from '../db/connection.js';

export const sessionRepository = {
  async create(token, userId, createdAt) {
    await run('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)', [
      token,
      userId,
      createdAt,
    ]);
  },

  async findUserIdByToken(token) {
    const row = await get('SELECT user_id FROM sessions WHERE token = ?', [token]);
    return row ? row.user_id : null;
  },

  async delete(token) {
    await run('DELETE FROM sessions WHERE token = ?', [token]);
  },
};
