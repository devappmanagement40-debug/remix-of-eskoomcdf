// Point d'entree Plesk — pre-built, aucune installation requise
// Plesk : Application startup file = app.js
//
// Variables d'environnement OBLIGATOIRES dans le panneau Plesk :
//   NODE_ENV=production
//   SUPABASE_DATABASE_URL   ← chaîne de connexion Supabase (postgresql://...)
//   VITE_SUPABASE_PUBLISHABLE_KEY
//   SUPABASE_SERVICE_ROLE_KEY
//   NOWPAYMENTS_API_KEY
//   NOWPAYMENTS_IPN_SECRET
//   NOWPAYMENTS_EMAIL
//   NOWPAYMENTS_PASSWORD
//   NOWPAYMENTS_WEBHOOK_URL  (ex: https://geenergy.top/api/nowpayments/webhook)
//
// PORT est fourni automatiquement par Plesk/Passenger — ne pas le définir manuellement.

process.env.NODE_ENV = process.env.NODE_ENV || "production";

// dist/index.mjs = bundle Plesk construit par le build.mjs racine
// Il contient le serveur Express + sert dist/public/ (frontend React)
import("./dist/index.mjs").catch((err) => {
  console.error("Erreur demarrage serveur:", err);
  process.exit(1);
});
