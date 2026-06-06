import { Router } from 'express';
import { dishService } from '../services/dishService.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireSpace } from '../middleware/requireSpace.js';
import { asyncHandler } from '../util/asyncHandler.js';

// mergeParams so :spaceId from the mount path is visible here.
export const dishRoutes = Router({ mergeParams: true });
dishRoutes.use(requireAuth, requireSpace);

dishRoutes.get('/', asyncHandler(async (req, res) => {
  res.json({ dishes: await dishService.list(req.space.id) });
}));

dishRoutes.post('/', asyncHandler(async (req, res) => {
  res.json({ dish: await dishService.create(req.space.id, req.user.id, req.body) });
}));

dishRoutes.put('/:did', asyncHandler(async (req, res) => {
  res.json({ dish: await dishService.update(req.space.id, Number(req.params.did), req.body) });
}));

dishRoutes.delete('/:did', asyncHandler(async (req, res) => {
  await dishService.remove(req.space.id, Number(req.params.did));
  res.json({ ok: true });
}));
