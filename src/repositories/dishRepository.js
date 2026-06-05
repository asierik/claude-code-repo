import { db } from '../db/connection.js';

// Map a stored row (JSON columns) to a domain dish with real arrays.
function toDish(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    ingredients: JSON.parse(row.ingredients),
    tags: JSON.parse(row.tags),
  };
}

export const dishRepository = {
  listBySpace(spaceId) {
    return db
      .prepare('SELECT * FROM dishes WHERE space_id = ? ORDER BY name COLLATE NOCASE')
      .all(spaceId)
      .map(toDish);
  },

  findById(id, spaceId) {
    return toDish(db.prepare('SELECT * FROM dishes WHERE id = ? AND space_id = ?').get(id, spaceId));
  },

  create(spaceId, userId, { name, ingredients, tags }, createdAt) {
    const info = db
      .prepare(
        `INSERT INTO dishes (space_id, name, ingredients, tags, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(spaceId, name, JSON.stringify(ingredients), JSON.stringify(tags), userId, createdAt);
    return this.findById(Number(info.lastInsertRowid), spaceId);
  },

  update(id, spaceId, { name, ingredients, tags }) {
    db.prepare('UPDATE dishes SET name = ?, ingredients = ?, tags = ? WHERE id = ? AND space_id = ?').run(
      name,
      JSON.stringify(ingredients),
      JSON.stringify(tags),
      id,
      spaceId
    );
    return this.findById(id, spaceId);
  },

  remove(id, spaceId) {
    db.prepare('DELETE FROM dishes WHERE id = ? AND space_id = ?').run(id, spaceId);
  },
};
