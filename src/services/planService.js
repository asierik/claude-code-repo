import { planRepository } from '../repositories/planRepository.js';
import { dishRepository } from '../repositories/dishRepository.js';
import { badRequest } from '../util/errors.js';

export const SLOTS = ['breakfast', 'lunch', 'dinner'];

export const planService = {
  async getPlan(spaceId) {
    return await planRepository.listBySpace(spaceId);
  },

  // dish_id null/undefined clears the slot; otherwise it must belong to the space.
  async setSlot(spaceId, { date, slot, dish_id }) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) || !SLOTS.includes(slot))
      throw badRequest('Valid date (YYYY-MM-DD) and slot (breakfast|lunch|dinner) required');

    if (dish_id == null) {
      await planRepository.clearSlot(spaceId, date, slot);
      return { cleared: true };
    }
    const dish = await dishRepository.findById(Number(dish_id), spaceId);
    if (!dish) throw badRequest('Unknown dish for this space');
    await planRepository.setSlot(spaceId, date, slot, Number(dish_id));
    return { ok: true };
  },
};
