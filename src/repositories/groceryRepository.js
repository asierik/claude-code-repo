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
};
