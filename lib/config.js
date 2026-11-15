export const FILES = Object.freeze({
  movimientos: 'movimientos.csv',
  inflacion: 'inflacion.csv',
  conclusiones: 'conclusiones.csv'
});

export const currentPath = name => `current/${FILES[name]}`;
export const historyPrefix = name => `history/${name}/`;
export const MAX_FILE_BYTES = 1024 * 1024;
export const MAX_HISTORY = 20;

export function validName(name) {
  return Object.prototype.hasOwnProperty.call(FILES, name);
}
