import { planRepository } from '../repositories/planRepository.js';
import { groceryRepository } from '../repositories/groceryRepository.js';
import { badRequest, notFound } from '../util/errors.js';

// Custom items reuse grocery_checked for their checked state, keyed by this prefix.
function customKey(id) {
  return `custom-${id}`;
}

// Normalizes an ingredient name into the key grocery_checked rows/list items
// are matched by (case-insensitive, so items still merge across dishes).
export function ingredientKey(name) {
  return String(name || '').trim().toLowerCase();
}

// Local YYYY-MM-DD for a timestamp, to compare against plan_entries.date.
function localYmd(ms) {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export const groceryService = {
  // Aggregate ingredients of every meal planned today or later (regardless of
  // time of day), merging duplicates by name and folding in ticked-off items.
  async buildList(spaceId, nowMs = Date.now()) {
    const today = localYmd(nowMs);
    const entries = await planRepository.listWithIngredients(spaceId);
    const items = new Map(); // key -> { key, name, amounts[], from:Set }

    for (const e of entries) {
      if (e.date < today) continue; // keep everything from today onward
      for (const ing of e.ingredients) {
        const key = ingredientKey(ing.name);
        if (!key) continue;
        if (!items.has(key)) items.set(key, { key, name: ing.name.trim(), amounts: [], from: new Set() });
        const item = items.get(key);
        if (ing.amount) item.amounts.push(ing.amount);
        item.from.add(e.dish_name);
      }
    }

    const checked = new Set(await groceryRepository.checkedKeys(spaceId));

    const custom = await groceryRepository.listCustomItems(spaceId);
    for (const c of custom) {
      const key = customKey(c.id);
      items.set(key, { key, name: c.name, amounts: [], from: [], custom: true, id: c.id });
    }

    return [...items.values()]
      .map((i) => ({
        key: i.key,
        name: i.name,
        amounts: i.amounts,
        from: [...i.from],
        checked: checked.has(i.key),
        custom: !!i.custom,
        ...(i.custom ? { id: i.id } : {}),
      }))
      // Unchecked first, then alphabetical.
      .sort((a, b) => Number(a.checked) - Number(b.checked) || a.name.localeCompare(b.name));
  },

  async setChecked(spaceId, rawKey, checked) {
    const key = ingredientKey(rawKey);
    if (!key) throw badRequest('item_key required');
    if (checked) await groceryRepository.check(spaceId, key);
    else await groceryRepository.uncheck(spaceId, key);
  },

  async addCustomItem(spaceId, userId, rawName) {
    const name = String(rawName || '').trim();
    if (!name) throw badRequest('Item name required');
    const item = await groceryRepository.addCustomItem(spaceId, userId, name, Date.now());
    return { key: customKey(item.id), id: item.id, name: item.name, amounts: [], from: [], checked: false, custom: true };
  },

  async removeCustomItem(spaceId, id) {
    if (!Number.isFinite(id)) throw notFound('Item not found');
    await groceryRepository.removeCustomItem(spaceId, id);
    await groceryRepository.uncheck(spaceId, customKey(id));
  },
};
