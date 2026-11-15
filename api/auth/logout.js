import { clearCookie } from '../../lib/auth.js';
import { json, method } from '../../lib/http.js';
export default function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  res.setHeader('Set-Cookie', clearCookie());
  json(res, 200, { ok: true }, { 'Cache-Control': 'no-store' });
}
