import fs from 'node:fs/promises';
import path from 'node:path';
import { put } from '@vercel/blob';
import { FILES, currentPath } from '../../lib/config.js';
import { readCurrent } from '../../lib/blob-data.js';
import { requireAuth } from '../../lib/guard.js';
import { json, method } from '../../lib/http.js';
export default async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  if (!requireAuth(req, res)) return;
  try {
    const results = [];
    for (const [name, filename] of Object.entries(FILES)) {
      if (await readCurrent(name)) { results.push({ name, status: 'exists' }); continue; }
      const content = await fs.readFile(path.join(process.cwd(), 'data', filename), 'utf8');
      await put(currentPath(name), content, { access: 'private', contentType: 'text/csv; charset=utf-8', addRandomSuffix: false });
      results.push({ name, status: 'uploaded' });
    }
    json(res, 200, { ok: true, results }, { 'Cache-Control': 'no-store' });
  } catch (e) { json(res, 500, { error: `No se pudo migrar: ${e.message}` }); }
}
