import { Router } from 'express';
import { spaceService } from '../services/spaceService.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireSpace } from '../middleware/requireSpace.js';
import { asyncHandler } from '../util/asyncHandler.js';

export const spaceRoutes = Router();

// All space routes require a signed-in user.
spaceRoutes.use(requireAuth);

// Spaces the user can access (their own + shared with them), plus which one
// (if any) is their favourite.
spaceRoutes.get('/', asyncHandler(async (req, res) => {
  res.json(await spaceService.listWithFavourite(req.user.id));
}));

spaceRoutes.get('/:spaceId/members', requireSpace, asyncHandler(async (req, res) => {
  res.json({ members: await spaceService.listMembers(req.space.id) });
}));

spaceRoutes.post('/:spaceId/share', requireSpace, asyncHandler(async (req, res) => {
  const result = await spaceService.share(req.space.id, req.role, req.body.username, req.user.id);
  res.json({ ok: true, ...result });
}));

// requireSpace already confirmed the user has access to :spaceId.
spaceRoutes.put('/:spaceId/favourite', requireSpace, asyncHandler(async (req, res) => {
  await spaceService.setFavourite(req.user.id, req.space.id);
  res.json({ ok: true });
}));

spaceRoutes.delete('/:spaceId/favourite', requireSpace, asyncHandler(async (req, res) => {
  await spaceService.clearFavourite(req.user.id, req.space.id);
  res.json({ ok: true });
}));
