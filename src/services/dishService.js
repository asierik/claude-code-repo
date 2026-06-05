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
  list(spaceId) {
    return dishRepository.listBySpace(spaceId);
  },

  create(spaceId, userId, body) {
    const name = String(body.name || '').trim();
    if (!name) throw badRequest('Dish name required');
    return dishRepository.create(
      spaceId,
      userId,
      { name, ingredients: cleanIngredients(body.ingredients), tags: cleanTags(body.tags) },
      Date.now()
    );
  },

  update(spaceId, dishId, body) {
    const existing = dishRepository.findById(dishId, spaceId);
    if (!existing) throw notFound('Dish not found');
    const name = String(body.name || '').trim() || existing.name;
    return dishRepository.update(dishId, spaceId, {
      name,
      ingredients: cleanIngredients(body.ingredients),
      tags: cleanTags(body.tags),
    });
  },

  remove(spaceId, dishId) {
    dishRepository.remove(dishId, spaceId);
  },
};
