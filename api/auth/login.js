import { readJson, json, method } from '../../lib/http.js';
import { passwordMatches, createSession, sessionCookie } from '../../lib/auth.js';
export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { password } = await readJson(req, 4096);
    if (!passwordMatches(password)) return json(res, 401, { error: 'Contraseña incorrecta' });
    res.setHeader('Set-Cookie', sessionCookie(createSession()));
    json(res, 200, { ok: true });
  } catch (e) { json(res, e.status || 500, { error: e.status ? e.message : 'Error interno' }); }
}
