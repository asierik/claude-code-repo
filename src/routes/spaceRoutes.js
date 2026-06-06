import { Router } from 'express';
import { spaceService } from '../services/spaceService.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireSpace } from '../middleware/requireSpace.js';
import { asyncHandler } from '../util/asyncHandler.js';

export const spaceRoutes = Router();

// All space routes require a signed-in user.
spaceRoutes.use(requireAuth);

// Spaces the user can access (their own + shared with them).
spaceRoutes.get('/', asyncHandler(async (req, res) => {
  res.json({ spaces: await spaceService.listForUser(req.user.id) });
}));

spaceRoutes.get('/:spaceId/members', requireSpace, asyncHandler(async (req, res) => {
  res.json({ members: await spaceService.listMembers(req.space.id) });
}));

spaceRoutes.post('/:spaceId/share', requireSpace, asyncHandler(async (req, res) => {
  const result = await spaceService.share(req.space.id, req.role, req.body.username, req.user.id);
  res.json({ ok: true, ...result });
}));
