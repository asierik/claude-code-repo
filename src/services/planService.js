import { planRepository } from '../repositories/planRepository.js';
import { dishRepository } from '../repositories/dishRepository.js';
import { badRequest } from '../util/errors.js';

export const SLOTS = ['breakfast', 'lunch', 'dinner'];
export const MAX_DISHES_PER_SLOT = 3;

function requireValidSlot(date, slot) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) || !SLOTS.includes(slot))
    throw badRequest('Valid date (YYYY-MM-DD) and slot (breakfast|lunch|dinner) required');
}

export const planService = {
  async getPlan(spaceId) {
    return await planRepository.listBySpace(spaceId);
  },

  // Adds one dish to a slot (up to MAX_DISHES_PER_SLOT); dish must belong to the space.
  async addToSlot(spaceId, { date, slot, dish_id }) {
    requireValidSlot(date, slot);
    const dishId = Number(dish_id);
    const dish = await dishRepository.findById(dishId, spaceId);
    if (!dish) throw badRequest('Unknown dish for this space');

    const current = await planRepository.listSlot(spaceId, date, slot);
    if (current.some((row) => row.dish_id === dishId)) throw badRequest('Dish is already in this slot');
    if (current.length >= MAX_DISHES_PER_SLOT)
      throw badRequest(`A slot can have at most ${MAX_DISHES_PER_SLOT} dishes`);

    await planRepository.addToSlot(spaceId, date, slot, dishId);
    return { ok: true };
  },

  // dish_id null/undefined clears the whole slot; otherwise removes just that dish.
  async removeFromSlot(spaceId, { date, slot, dish_id }) {
    requireValidSlot(date, slot);

    if (dish_id == null) {
      await planRepository.clearSlot(spaceId, date, slot);
      return { cleared: true };
    }
    await planRepository.removeFromSlot(spaceId, date, slot, Number(dish_id));
    return { ok: true };
  },
};
