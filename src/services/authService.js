import crypto from 'node:crypto';
import { userRepository } from '../repositories/userRepository.js';
import { sessionRepository } from '../repositories/sessionRepository.js';
import { spaceService } from './spaceService.js';
import { hashPassword, makeSalt, verifyPassword } from '../util/password.js';
import { badRequest, conflict, unauthorized } from '../util/errors.js';

function normalizeUsername(raw) {
  return String(raw || '').trim().toLowerCase();
}

export const authService = {
  // Returns { user, token }. Caller (route) is responsible for the cookie.
  register(rawUsername, rawPassword) {
    const username = normalizeUsername(rawUsername);
    const password = String(rawPassword || '');
    if (username.length < 2 || password.length < 4)
      throw badRequest('Username (2+ chars) and password (4+ chars) required');
    if (userRepository.existsByUsername(username)) throw conflict('Username already taken');

    const salt = makeSalt();
    const userId = userRepository.create({
      username,
      passHash: hashPassword(password, salt),
      salt,
      createdAt: Date.now(),
    });

    // Every new user gets a personal space to start from.
    spaceService.createForOwner(`${username}'s kitchen`, userId);

    return { user: { id: userId, username }, token: this.createSession(userId) };
  },

  login(rawUsername, rawPassword) {
    const username = normalizeUsername(rawUsername);
    const user = userRepository.findByUsername(username);
    if (!user || !verifyPassword(String(rawPassword || ''), user.salt, user.pass_hash))
      throw unauthorized('Invalid username or password');
    return { user: { id: user.id, username: user.username }, token: this.createSession(user.id) };
  },

  logout(token) {
    if (token) sessionRepository.delete(token);
  },

  createSession(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    sessionRepository.create(token, userId, Date.now());
    return token;
  },

  userForToken(token) {
    if (!token) return null;
    const userId = sessionRepository.findUserIdByToken(token);
    return userId ? userRepository.findById(userId) : null;
  },
};
