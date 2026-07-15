import { all, run } from '../db/connection.js';

export const groceryRepository = {
  async checkedKeys(spaceId) {
    return (await all('SELECT item_key FROM grocery_checked WHERE space_id = ?', [spaceId])).map(
      (r) => r.item_key
    );
  },

  async check(spaceId, key) {
    await run('INSERT OR IGNORE INTO grocery_checked (space_id, item_key) VALUES (?, ?)', [spaceId, key]);
  },

  async uncheck(spaceId, key) {
    await run('DELETE FROM grocery_checked WHERE space_id = ? AND item_key = ?', [spaceId, key]);
  },

  async listCustomItems(spaceId) {
    return await all('SELECT * FROM grocery_custom_items WHERE space_id = ? ORDER BY id', [spaceId]);
  },

  async addCustomItem(spaceId, userId, name, createdAt) {
    const info = await run(
      'INSERT INTO grocery_custom_items (space_id, name, created_by, created_at) VALUES (?, ?, ?, ?)',
      [spaceId, name, userId, createdAt]
    );
    return { id: Number(info.lastInsertRowid ?? 0), space_id: spaceId, name, created_by: userId, created_at: createdAt };
  },

  async removeCustomItem(spaceId, id) {
    await run('DELETE FROM grocery_custom_items WHERE id = ? AND space_id = ?', [id, spaceId]);
  },
};
