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

// Set or clear one breakfast/lunch/dinner slot.
planRoutes.put('/', asyncHandler(async (req, res) => {
  res.json(await planService.setSlot(req.space.id, req.body));
}));
