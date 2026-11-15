// Cargar antes de app.js. Redirige las lecturas existentes de data/*.csv a Vercel Blob.
(() => {
  const originalFetch = window.fetch.bind(window);
  const names = new Set(['movimientos', 'inflacion', 'conclusiones']);
  window.fetch = (input, init) => {
    const raw = typeof input === 'string' ? input : input?.url;
    if (raw) {
      const url = new URL(raw, location.href);
      const match = url.pathname.match(/(?:^|\/)data\/(movimientos|inflacion|conclusiones)\.csv$/);
      if (match && names.has(match[1])) return originalFetch(`/api/data?file=${match[1]}`, init);
    }
    return originalFetch(input, init);
  };
})();
