import { Router } from 'express';
import { planService } from '../services/planService.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireSpace } from '../middleware/requireSpace.js';

export const planRoutes = Router({ mergeParams: true });
planRoutes.use(requireAuth, requireSpace);

planRoutes.get('/', (req, res) => {
  res.json({ plan: planService.getPlan(req.space.id) });
});

// Set or clear one breakfast/lunch/dinner slot.
planRoutes.put('/', (req, res) => {
  res.json(planService.setSlot(req.space.id, req.body));
});
