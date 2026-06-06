const SESSION_COOKIE = 'sid';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';

function buildCookieValue(value, options) {
  const flags = [`${SESSION_COOKIE}=${value}`, 'HttpOnly', 'Path=/', `Max-Age=${options.maxAge}`, 'SameSite=Lax'];
  if (options.secure) flags.push('Secure');
  return flags.join('; ');
}

export function parseCookies(req) {
  const out = {};
  const header = req.headers.cookie;
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function readSessionToken(req) {
  return parseCookies(req)[SESSION_COOKIE] || null;
}

export function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', buildCookieValue(token, { maxAge: MAX_AGE, secure: COOKIE_SECURE }));
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', buildCookieValue('', { maxAge: 0, secure: COOKIE_SECURE }));
}
