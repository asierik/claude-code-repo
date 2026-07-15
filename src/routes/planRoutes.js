import { Router } from 'express';
import { planService } from '../services/planService.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireSpace } from '../middleware/requireSpace.js';
import { asyncHandler } from '../util/asyncHandler.js';

export const planRoutes = Router({ mergeParams: true });
planRoutes.use(requireAuth, requireSpace);

planRoutes.get('/', asyncHandler(async (req, res) => {
  res.json({ plan: await planService.getPlan(req.space.id) });
}));

// Add one dish to a breakfast/lunch/dinner slot (up to planService.MAX_DISHES_PER_SLOT).
planRoutes.post('/', asyncHandler(async (req, res) => {
  res.json(await planService.addToSlot(req.space.id, req.body));
}));

// Remove one dish from a slot, or the whole slot when dish_id is omitted.
planRoutes.delete('/', asyncHandler(async (req, res) => {
  res.json(await planService.removeFromSlot(req.space.id, req.body));
}));
