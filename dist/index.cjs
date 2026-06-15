'use strict';
(async () => { await import('./index.mjs'); })()
  .catch((err) => { console.error('Startup error:', err); process.exit(1); });
