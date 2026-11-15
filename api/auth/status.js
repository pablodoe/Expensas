import { isAuthenticated } from '../../lib/auth.js';
import { json, method } from '../../lib/http.js';
export default function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  json(res, 200, { authenticated: isAuthenticated(req) }, { 'Cache-Control': 'no-store' });
}
