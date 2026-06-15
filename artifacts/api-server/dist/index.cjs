'use strict';
// Plesk/cPanel CJS entry point — dynamically imports the ESM bundle
(async () => {
  await import('./index.mjs');
})().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
