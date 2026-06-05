import { db } from '../db/connection.js';

export const spaceRepository = {
  create({ name, ownerId, createdAt }) {
    const info = db
      .prepare('INSERT INTO spaces (name, owner_id, created_at) VALUES (?, ?, ?)')
      .run(name, ownerId, createdAt);
    return Number(info.lastInsertRowid);
  },

  findById(id) {
    return db.prepare('SELECT * FROM spaces WHERE id = ?').get(id) || null;
  },

  // Spaces a user owns or has been invited to, with their role + owner name.
  listForUser(userId) {
    return db
      .prepare(
        `SELECT s.id, s.name, s.owner_id, m.role,
                (SELECT username FROM users WHERE id = s.owner_id) AS owner
         FROM spaces s
         JOIN space_members m ON m.space_id = s.id
         WHERE m.user_id = ?
         ORDER BY s.id`
      )
      .all(userId);
  },

  addMember(spaceId, userId, role) {
    db.prepare(
      'INSERT OR IGNORE INTO space_members (space_id, user_id, role) VALUES (?, ?, ?)'
    ).run(spaceId, userId, role);
  },

  findMembership(spaceId, userId) {
    return (
      db.prepare('SELECT * FROM space_members WHERE space_id = ? AND user_id = ?').get(spaceId, userId) ||
      null
    );
  },

  listMembers(spaceId) {
    return db
      .prepare(
        `SELECT u.username, m.role
         FROM space_members m JOIN users u ON u.id = m.user_id
         WHERE m.space_id = ?
         ORDER BY m.role = 'owner' DESC, u.username`
      )
      .all(spaceId);
  },
};
