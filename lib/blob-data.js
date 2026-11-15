import crypto from 'node:crypto';
import { get, put, list, del } from '@vercel/blob';
import { currentPath, historyPrefix, MAX_HISTORY } from './config.js';

export const versionOf = content => crypto.createHash('sha256').update(content).digest('hex');

export async function readCurrent(name) {
  const result = await get(currentPath(name), { access: 'private' });
  if (!result) return null;
  const content = await new Response(result.stream).text();
  return { content, version: versionOf(content) };
}

export async function writeCurrent(name, content, expectedVersion) {
  const current = await readCurrent(name);
  if (current && expectedVersion && current.version !== expectedVersion) {
    const error = new Error('El archivo cambió desde que lo abriste');
    error.status = 409; throw error;
  }
  if (current) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await put(`${historyPrefix(name)}${stamp}.csv`, current.content, {
      access: 'private', contentType: 'text/csv; charset=utf-8', addRandomSuffix: false
    });
  }
  await put(currentPath(name), content, {
    access: 'private', contentType: 'text/csv; charset=utf-8', addRandomSuffix: false, allowOverwrite: true
  });
  await pruneHistory(name);
  return { version: versionOf(content) };
}

export async function history(name) {
  const result = await list({ prefix: historyPrefix(name), limit: 100 });
  return result.blobs.sort((a, b) => b.uploadedAt - a.uploadedAt).map(b => ({
    pathname: b.pathname, uploadedAt: b.uploadedAt, size: b.size
  }));
}

async function pruneHistory(name) {
  const items = await history(name);
  if (items.length > MAX_HISTORY) await del(items.slice(MAX_HISTORY).map(x => x.pathname));
}

export async function restoreVersion(name, pathname, expectedVersion) {
  if (!pathname.startsWith(historyPrefix(name))) throw Object.assign(new Error('Histórico inválido'), { status: 400 });
  const result = await get(pathname, { access: 'private' });
  if (!result) throw Object.assign(new Error('Versión no encontrada'), { status: 404 });
  return writeCurrent(name, await new Response(result.stream).text(), expectedVersion);
}
