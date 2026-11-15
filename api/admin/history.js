import { validName } from '../../lib/config.js';
import { history } from '../../lib/blob-data.js';
import { requireAuth } from '../../lib/guard.js';
import { json, method } from '../../lib/http.js';
export default async function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  if (!requireAuth(req, res)) return;
  const name = req.query?.file;
  if (!validName(name)) return json(res, 400, { error: 'Archivo inválido' });
  try { json(res, 200, { items: await history(name) }, { 'Cache-Control': 'no-store' }); }
  catch { json(res, 500, { error: 'No se pudo consultar el historial' }); }
}
