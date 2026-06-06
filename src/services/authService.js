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
  async register(rawUsername, rawPassword) {
    const username = normalizeUsername(rawUsername);
    const password = String(rawPassword || '');
    if (username.length < 2 || password.length < 4)
      throw badRequest('Username (2+ chars) and password (4+ chars) required');
    if (await userRepository.existsByUsername(username)) throw conflict('Username already taken');

    const salt = makeSalt();
    const userId = await userRepository.create({
      username,
      passHash: hashPassword(password, salt),
      salt,
      createdAt: Date.now(),
    });

    // Every new user gets a personal space to start from.
    await spaceService.createForOwner(`${username}'s kitchen`, userId);

    return { user: { id: userId, username }, token: await this.createSession(userId) };
  },

  async login(rawUsername, rawPassword) {
    const username = normalizeUsername(rawUsername);
    const user = await userRepository.findByUsername(username);
    if (!user || !verifyPassword(String(rawPassword || ''), user.salt, user.pass_hash))
      throw unauthorized('Invalid username or password');
    return { user: { id: user.id, username: user.username }, token: await this.createSession(user.id) };
  },

  async logout(token) {
    if (token) await sessionRepository.delete(token);
  },

  async createSession(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    await sessionRepository.create(token, userId, Date.now());
    return token;
  },

  async userForToken(token) {
    if (!token) return null;
    const userId = await sessionRepository.findUserIdByToken(token);
    return userId ? await userRepository.findById(userId) : null;
  },
};
