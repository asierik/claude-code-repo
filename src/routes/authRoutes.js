import { Router } from 'express';
import { authService } from '../services/authService.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { setSessionCookie, clearSessionCookie, readSessionToken } from '../util/cookies.js';
import { asyncHandler } from '../util/asyncHandler.js';

export const authRoutes = Router();

authRoutes.post('/register', asyncHandler(async (req, res) => {
  const { user, token } = await authService.register(req.body.username, req.body.password);
  setSessionCookie(res, token);
  res.json({ user });
}));

authRoutes.post('/login', asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.body.username, req.body.password);
  setSessionCookie(res, token);
  res.json({ user });
}));

authRoutes.post('/logout', asyncHandler(async (req, res) => {
  await authService.logout(readSessionToken(req));
  clearSessionCookie(res);
  res.json({ ok: true });
}));

authRoutes.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
