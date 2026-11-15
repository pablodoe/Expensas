import { MAX_FILE_BYTES } from './config.js';
export function validateCsv(content) {
  if (typeof content !== 'string' || !content.trim()) throw Object.assign(new Error('El CSV está vacío'), { status: 400 });
  if (Buffer.byteLength(content, 'utf8') > MAX_FILE_BYTES) throw Object.assign(new Error('El CSV supera 1 MB'), { status: 413 });
  if (content.includes('\0')) throw Object.assign(new Error('El CSV contiene datos inválidos'), { status: 400 });
  const first = content.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0];
  if (!first.includes(';')) throw Object.assign(new Error('El encabezado debe usar punto y coma'), { status: 400 });
}
