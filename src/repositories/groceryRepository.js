import { db } from '../db/connection.js';

export const groceryRepository = {
  checkedKeys(spaceId) {
    return db
      .prepare('SELECT item_key FROM grocery_checked WHERE space_id = ?')
      .all(spaceId)
      .map((r) => r.item_key);
  },

  check(spaceId, key) {
    db.prepare('INSERT OR IGNORE INTO grocery_checked (space_id, item_key) VALUES (?, ?)').run(spaceId, key);
  },

  uncheck(spaceId, key) {
    db.prepare('DELETE FROM grocery_checked WHERE space_id = ? AND item_key = ?').run(spaceId, key);
  },
};
