import { validName } from '../../lib/config.js';
import { restoreVersion } from '../../lib/blob-data.js';
import { requireAuth } from '../../lib/guard.js';
import { readJson, json, method } from '../../lib/http.js';
export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  if (!requireAuth(req, res)) return;
  try {
    const { file, pathname, expectedVersion } = await readJson(req, 10000);
    if (!validName(file)) return json(res, 400, { error: 'Archivo inválido' });
    const saved = await restoreVersion(file, pathname, expectedVersion);
    json(res, 200, { ok: true, ...saved }, { 'Cache-Control': 'no-store' });
  } catch (e) { json(res, e.status || 500, { error: e.status ? e.message : 'No se pudo restaurar' }); }
}
