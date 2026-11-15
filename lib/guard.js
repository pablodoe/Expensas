import { isAuthenticated } from './auth.js';
import { json } from './http.js';
export function requireAuth(req, res) {
  if (isAuthenticated(req)) return true;
  json(res, 401, { error: 'Sesión inválida o vencida' }, { 'Cache-Control': 'no-store' });
  return false;
}
