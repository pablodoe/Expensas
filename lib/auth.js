import crypto from 'node:crypto';

const COOKIE = 'expensas_admin';
const TTL_SECONDS = 3600;

function b64url(value) {
  return Buffer.from(value).toString('base64url');
}
function secret() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET debe tener al menos 32 caracteres');
  }
  return process.env.SESSION_SECRET;
}
function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}
export function createSession() {
  const payload = b64url(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + TTL_SECONDS }));
  return `${payload}.${sign(payload)}`;
}
function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(part => {
    const i = part.indexOf('=');
    return [part.slice(0, i).trim(), decodeURIComponent(part.slice(i + 1))];
  }));
}
export function isAuthenticated(req) {
  const token = cookies(req)[COOKIE];
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = sign(payload);
  const a = Buffer.from(signature); const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url')).exp > Date.now() / 1000; }
  catch { return false; }
}
export function sessionCookie(token) {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${TTL_SECONDS}`;
}
export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
export function passwordMatches(input) {
  const configured = process.env.ADMIN_PASSWORD || '';
  const a = crypto.createHash('sha256').update(String(input)).digest();
  const b = crypto.createHash('sha256').update(configured).digest();
  return configured.length >= 10 && crypto.timingSafeEqual(a, b);
}
