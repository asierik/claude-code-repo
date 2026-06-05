import { authService } from '../services/authService.js';
import { readSessionToken } from '../util/cookies.js';
import { unauthorized } from '../util/errors.js';

// Attaches req.user and req.token, or throws 401.
export function requireAuth(req, _res, next) {
  const token = readSessionToken(req);
  const user = authService.userForToken(token);
  if (!user) throw unauthorized('Not signed in');
  req.user = user;
  req.token = token;
  next();
}
