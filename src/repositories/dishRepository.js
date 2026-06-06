import { all, get, run } from '../db/connection.js';

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
  async listBySpace(spaceId) {
    return (await all('SELECT * FROM dishes WHERE space_id = ? ORDER BY name COLLATE NOCASE', [spaceId])).map(toDish);
  },

  async findById(id, spaceId) {
    return toDish(await get('SELECT * FROM dishes WHERE id = ? AND space_id = ?', [id, spaceId]));
  },

  async create(spaceId, userId, { name, ingredients, tags }, createdAt) {
    const info = await run(
      `INSERT INTO dishes (space_id, name, ingredients, tags, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      [spaceId, name, JSON.stringify(ingredients), JSON.stringify(tags), userId, createdAt]
    );
    return this.findById(Number(info.lastInsertRowid ?? 0), spaceId);
  },

  async update(id, spaceId, { name, ingredients, tags }) {
    await run('UPDATE dishes SET name = ?, ingredients = ?, tags = ? WHERE id = ? AND space_id = ?', [
      name,
      JSON.stringify(ingredients),
      JSON.stringify(tags),
      id,
      spaceId,
    ]);
    return this.findById(id, spaceId);
  },

  async remove(id, spaceId) {
    await run('DELETE FROM dishes WHERE id = ? AND space_id = ?', [id, spaceId]);
  },
};
