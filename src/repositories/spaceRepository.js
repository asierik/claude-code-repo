import { all, get, run } from '../db/connection.js';

export const spaceRepository = {
  async create({ name, ownerId, createdAt }) {
    const info = await run('INSERT INTO spaces (name, owner_id, created_at) VALUES (?, ?, ?)', [
      name,
      ownerId,
      createdAt,
    ]);
    return Number(info.lastInsertRowid ?? 0);
  },

  async findById(id) {
    return (await get('SELECT * FROM spaces WHERE id = ?', [id])) || null;
  },

  // Spaces a user owns or has been invited to, with their role + owner name.
  async listForUser(userId) {
    return await all(
      `SELECT s.id, s.name, s.owner_id, m.role,
                (SELECT username FROM users WHERE id = s.owner_id) AS owner
         FROM spaces s
         JOIN space_members m ON m.space_id = s.id
         WHERE m.user_id = ?
         ORDER BY s.id`,
      [userId]
    );
  },

  async addMember(spaceId, userId, role) {
    await run(
      'INSERT OR IGNORE INTO space_members (space_id, user_id, role) VALUES (?, ?, ?)',
      [spaceId, userId, role]
    );
  },

  async findMembership(spaceId, userId) {
    return (
      (await get('SELECT * FROM space_members WHERE space_id = ? AND user_id = ?', [spaceId, userId])) ||
      null
    );
  },

  async listMembers(spaceId) {
    return await all(
      `SELECT u.username, m.role
         FROM space_members m JOIN users u ON u.id = m.user_id
         WHERE m.space_id = ?
         ORDER BY m.role = 'owner' DESC, u.username`,
      [spaceId]
    );
  },
};
