import { Router } from 'express';
import { spaceService } from '../services/spaceService.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireSpace } from '../middleware/requireSpace.js';

export const spaceRoutes = Router();

// All space routes require a signed-in user.
spaceRoutes.use(requireAuth);

// Spaces the user can access (their own + shared with them).
spaceRoutes.get('/', (req, res) => {
  res.json({ spaces: spaceService.listForUser(req.user.id) });
});

spaceRoutes.get('/:spaceId/members', requireSpace, (req, res) => {
  res.json({ members: spaceService.listMembers(req.space.id) });
});

spaceRoutes.post('/:spaceId/share', requireSpace, (req, res) => {
  const result = spaceService.share(req.space.id, req.role, req.body.username, req.user.id);
  res.json({ ok: true, ...result });
});
