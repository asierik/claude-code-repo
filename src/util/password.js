import crypto from 'node:crypto';

export function makeSalt() {
  return crypto.randomBytes(16).toString('hex');
}

export function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function verifyPassword(password, salt, expectedHex) {
  const attempt = Buffer.from(hashPassword(password, salt), 'hex');
  const stored = Buffer.from(expectedHex, 'hex');
  return attempt.length === stored.length && crypto.timingSafeEqual(attempt, stored);
}
