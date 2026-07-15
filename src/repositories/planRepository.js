import { all, run } from '../db/connection.js';

export const planRepository = {
  // Plan entries with the dish name, for rendering the calendar. A slot can
  // now hold several rows (one per dish).
  async listBySpace(spaceId) {
    return await all(
      `SELECT p.id, p.date, p.slot, p.dish_id, d.name AS dish_name
         FROM plan_entries p JOIN dishes d ON d.id = p.dish_id
         WHERE p.space_id = ?
         ORDER BY p.id`,
      [spaceId]
    );
  },

  // Plan entries with full ingredient lists, for building the grocery list.
  async listWithIngredients(spaceId) {
    return (await all(
      `SELECT p.date, p.slot, d.name AS dish_name, d.ingredients
         FROM plan_entries p JOIN dishes d ON d.id = p.dish_id
         WHERE p.space_id = ?`,
      [spaceId]
    )).map((row) => ({ ...row, ingredients: JSON.parse(row.ingredients) }));
  },

  // dish_ids currently in one slot, for the service to check duplicates/count.
  async listSlot(spaceId, date, slot) {
    return await all(
      'SELECT dish_id FROM plan_entries WHERE space_id = ? AND date = ? AND slot = ?',
      [spaceId, date, slot]
    );
  },

  async addToSlot(spaceId, date, slot, dishId) {
    await run(
      `INSERT INTO plan_entries (space_id, date, slot, dish_id) VALUES (?, ?, ?, ?)
       ON CONFLICT(space_id, date, slot, dish_id) DO NOTHING`,
      [spaceId, date, slot, dishId]
    );
  },

  async removeFromSlot(spaceId, date, slot, dishId) {
    await run(
      'DELETE FROM plan_entries WHERE space_id = ? AND date = ? AND slot = ? AND dish_id = ?',
      [spaceId, date, slot, dishId]
    );
  },

  async clearSlot(spaceId, date, slot) {
    await run('DELETE FROM plan_entries WHERE space_id = ? AND date = ? AND slot = ?', [
      spaceId,
      date,
      slot,
    ]);
  },
};
