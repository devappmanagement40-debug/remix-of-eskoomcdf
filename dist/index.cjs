'use strict';
// Point d'entrée Plesk — lance le serveur API bundlé
(async () => {
  await import('../artifacts/api-server/dist/index.mjs');
})().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
