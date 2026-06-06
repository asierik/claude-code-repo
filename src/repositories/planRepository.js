import { all, run } from '../db/connection.js';

export const planRepository = {
  // Plan entries with the dish name, for rendering the calendar.
  async listBySpace(spaceId) {
    return await all(
      `SELECT p.date, p.slot, p.dish_id, d.name AS dish_name
         FROM plan_entries p JOIN dishes d ON d.id = p.dish_id
         WHERE p.space_id = ?`,
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

  async setSlot(spaceId, date, slot, dishId) {
    await run(
      `INSERT INTO plan_entries (space_id, date, slot, dish_id) VALUES (?, ?, ?, ?)
       ON CONFLICT(space_id, date, slot) DO UPDATE SET dish_id = excluded.dish_id`,
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
