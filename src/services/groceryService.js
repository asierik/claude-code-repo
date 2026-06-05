import { planRepository } from '../repositories/planRepository.js';
import { groceryRepository } from '../repositories/groceryRepository.js';
import { badRequest } from '../util/errors.js';

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
  buildList(spaceId, nowMs = Date.now()) {
    const today = localYmd(nowMs);
    const entries = planRepository.listWithIngredients(spaceId);
    const items = new Map(); // key -> { key, name, amounts[], from:Set }

    for (const e of entries) {
      if (e.date < today) continue; // keep everything from today onward
      for (const ing of e.ingredients) {
        const key = ing.name.trim().toLowerCase();
        if (!key) continue;
        if (!items.has(key)) items.set(key, { key, name: ing.name.trim(), amounts: [], from: new Set() });
        const item = items.get(key);
        if (ing.amount) item.amounts.push(ing.amount);
        item.from.add(e.dish_name);
      }
    }

    const checked = new Set(groceryRepository.checkedKeys(spaceId));
    return [...items.values()]
      .map((i) => ({
        key: i.key,
        name: i.name,
        amounts: i.amounts,
        from: [...i.from],
        checked: checked.has(i.key),
      }))
      // Unchecked first, then alphabetical.
      .sort((a, b) => Number(a.checked) - Number(b.checked) || a.name.localeCompare(b.name));
  },

  setChecked(spaceId, rawKey, checked) {
    const key = String(rawKey || '').trim().toLowerCase();
    if (!key) throw badRequest('item_key required');
    if (checked) groceryRepository.check(spaceId, key);
    else groceryRepository.uncheck(spaceId, key);
  },
};
