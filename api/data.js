import { validName } from '../lib/config.js';
import { readCurrent } from '../lib/blob-data.js';
import { json, method } from '../lib/http.js';
export default async function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  const name = req.query?.file;
  if (!validName(name)) return json(res, 400, { error: 'Archivo inválido' });
  try {
    const file = await readCurrent(name);
    if (!file) return json(res, 404, { error: 'Archivo todavía no cargado en Blob' });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
    res.setHeader('ETag', `"${file.version}"`);
    res.end(file.content);
  } catch { json(res, 500, { error: 'No se pudo leer el archivo' }); }
}
