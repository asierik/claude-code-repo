import { dishRepository } from '../repositories/dishRepository.js';
import { badRequest, notFound } from '../util/errors.js';

function cleanIngredients(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((i) => ({ name: String(i?.name || '').trim(), amount: String(i?.amount || '').trim() }))
    .filter((i) => i.name);
}

function cleanTags(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((t) => String(t).trim().toLowerCase()).filter(Boolean))];
}

export const dishService = {
  async list(spaceId) {
    return await dishRepository.listBySpace(spaceId);
  },

  async create(spaceId, userId, body) {
    const name = String(body.name || '').trim();
    if (!name) throw badRequest('Dish name required');
    return await dishRepository.create(
      spaceId,
      userId,
      { name, ingredients: cleanIngredients(body.ingredients), tags: cleanTags(body.tags) },
      Date.now()
    );
  },

  async update(spaceId, dishId, body) {
    const existing = await dishRepository.findById(dishId, spaceId);
    if (!existing) throw notFound('Dish not found');
    const name = String(body.name || '').trim() || existing.name;
    return await dishRepository.update(dishId, spaceId, {
      name,
      ingredients: cleanIngredients(body.ingredients),
      tags: cleanTags(body.tags),
    });
  },

  async remove(spaceId, dishId) {
    await dishRepository.remove(dishId, spaceId);
  },
};
