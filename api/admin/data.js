import { validName } from '../../lib/config.js';
import { readCurrent, writeCurrent } from '../../lib/blob-data.js';
import { requireAuth } from '../../lib/guard.js';
import { readJson, json, method } from '../../lib/http.js';
import { validateCsv } from '../../lib/validate.js';
export default async function handler(req, res) {
  if (!method(req, res, ['GET', 'PUT'])) return;
  if (!requireAuth(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');
  const name = req.query?.file;
  if (!validName(name)) return json(res, 400, { error: 'Archivo inválido' });
  try {
    if (req.method === 'GET') {
      const file = await readCurrent(name);
      if (!file) return json(res, 404, { error: 'Archivo todavía no cargado en Blob' });
      return json(res, 200, file);
    }
    const { content, expectedVersion } = await readJson(req);
    validateCsv(content);
    const saved = await writeCurrent(name, content.replace(/\r?\n/g, '\n'), expectedVersion);
    json(res, 200, { ok: true, ...saved });
  } catch (e) { json(res, e.status || 500, { error: e.status ? e.message : 'No se pudo guardar' }); }
}
