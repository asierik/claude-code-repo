import { Router } from 'express';
import { dishService } from '../services/dishService.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireSpace } from '../middleware/requireSpace.js';

// mergeParams so :spaceId from the mount path is visible here.
export const dishRoutes = Router({ mergeParams: true });
dishRoutes.use(requireAuth, requireSpace);

dishRoutes.get('/', (req, res) => {
  res.json({ dishes: dishService.list(req.space.id) });
});

dishRoutes.post('/', (req, res) => {
  res.json({ dish: dishService.create(req.space.id, req.user.id, req.body) });
});

dishRoutes.put('/:did', (req, res) => {
  res.json({ dish: dishService.update(req.space.id, Number(req.params.did), req.body) });
});

dishRoutes.delete('/:did', (req, res) => {
  dishService.remove(req.space.id, Number(req.params.did));
  res.json({ ok: true });
});
