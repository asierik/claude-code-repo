import { Router } from 'express';
import { authService } from '../services/authService.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { setSessionCookie, clearSessionCookie, readSessionToken } from '../util/cookies.js';

export const authRoutes = Router();

authRoutes.post('/register', (req, res) => {
  const { user, token } = authService.register(req.body.username, req.body.password);
  setSessionCookie(res, token);
  res.json({ user });
});

authRoutes.post('/login', (req, res) => {
  const { user, token } = authService.login(req.body.username, req.body.password);
  setSessionCookie(res, token);
  res.json({ user });
});

authRoutes.post('/logout', (req, res) => {
  authService.logout(readSessionToken(req));
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRoutes.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
