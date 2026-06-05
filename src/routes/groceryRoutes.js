import { Router } from 'express';
import { groceryService } from '../services/groceryService.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireSpace } from '../middleware/requireSpace.js';

export const groceryRoutes = Router({ mergeParams: true });
groceryRoutes.use(requireAuth, requireSpace);

groceryRoutes.get('/', (req, res) => {
  res.json({ grocery: groceryService.buildList(req.space.id) });
});

groceryRoutes.post('/check', (req, res) => {
  groceryService.setChecked(req.space.id, req.body.item_key, !!req.body.checked);
  res.json({ ok: true });
});
