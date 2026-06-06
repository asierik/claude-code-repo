import { authService } from '../services/authService.js';
import { readSessionToken } from '../util/cookies.js';
import { unauthorized } from '../util/errors.js';
import { asyncHandler } from '../util/asyncHandler.js';

// Attaches req.user and req.token, or throws 401.
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = readSessionToken(req);
  const user = await authService.userForToken(token);
  if (!user) throw unauthorized('Not signed in');
  req.user = user;
  req.token = token;
  next();
});
