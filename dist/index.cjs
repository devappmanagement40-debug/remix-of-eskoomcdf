'use strict';
// Plesk entry point — delegates to root app.js
(async () => {
  await import('../app.js');
})().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
