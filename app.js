// Point d'entree Plesk — pre-built, aucune installation requise
// Plesk : Application startup file = app.js
// Variables d'environnement requises dans Plesk :
//   PORT (fourni automatiquement par Plesk)
//   NODE_ENV=production
//   VITE_SUPABASE_PROJECT_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   NOWPAYMENTS_API_KEY
//   NOWPAYMENTS_IPN_SECRET
//   NOWPAYMENTS_EMAIL
//   NOWPAYMENTS_PASSWORD
//   NOWPAYMENTS_WEBHOOK_URL  (ex: https://votredomaine.com/api/nowpayments/webhook)

process.env.NODE_ENV = process.env.NODE_ENV || "production";

import("./artifacts/api-server/dist/index.mjs").catch((err) => {
  console.error("Erreur demarrage serveur:", err);
  process.exit(1);
});
