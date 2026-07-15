import { Router } from 'express';
import { groceryService } from '../services/groceryService.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireSpace } from '../middleware/requireSpace.js';
import { asyncHandler } from '../util/asyncHandler.js';

export const groceryRoutes = Router({ mergeParams: true });
groceryRoutes.use(requireAuth, requireSpace);

groceryRoutes.get('/', asyncHandler(async (req, res) => {
  res.json({ grocery: await groceryService.buildList(req.space.id) });
}));

groceryRoutes.post('/check', asyncHandler(async (req, res) => {
  await groceryService.setChecked(req.space.id, req.body.item_key, !!req.body.checked);
  res.json({ ok: true });
}));

groceryRoutes.post('/custom', asyncHandler(async (req, res) => {
  res.json({ item: await groceryService.addCustomItem(req.space.id, req.user.id, req.body.name) });
}));

groceryRoutes.delete('/custom/:id', asyncHandler(async (req, res) => {
  await groceryService.removeCustomItem(req.space.id, Number(req.params.id));
  res.json({ ok: true });
}));
