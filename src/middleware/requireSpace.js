import { spaceService } from '../services/spaceService.js';
import { asyncHandler } from '../util/asyncHandler.js';

// Must run after requireAuth. Verifies the user can access :spaceId and
// attaches req.space + req.role. Enforces the spec's privacy rule on every
// space-scoped route.
export const requireSpace = asyncHandler(async (req, _res, next) => {
  const { space, role } = await spaceService.requireAccess(Number(req.params.spaceId), req.user.id);
  req.space = space;
  req.role = role;
  next();
});
