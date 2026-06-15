# Guide de déploiement Plesk — GE Energy

## Résumé des étapes

1. Créer la base de données PostgreSQL sur Plesk
2. Exécuter `database-setup.sql` pour créer les 35 tables
3. Configurer les variables d'environnement
4. Démarrer le serveur avec `node dist/index.cjs`
5. Créer le premier compte admin

---

## Étape 1 — Base de données PostgreSQL

Dans Plesk → Bases de données → Ajouter une base de données :
- Choisir PostgreSQL
- Nom : `ge_energy` (ou ce que vous voulez)
- Utilisateur + mot de passe à noter

La `DATABASE_URL` aura ce format :
```
postgresql://USER:PASSWORD@localhost:5432/ge_energy
```

---

## Étape 2 — Créer les tables

Ouvrir **phpPgAdmin** depuis Plesk, sélectionner votre base, puis aller dans **SQL** et coller tout le contenu du fichier `database-setup.sql`.

Ou via terminal SSH :
```bash
psql -U USER -d ge_energy -f database-setup.sql
```

Vérification : `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';`
→ Doit afficher **35**

---

## Étape 3 — Variables d'environnement

Dans Plesk → Node.js → Variables d'environnement (ou fichier `.env`) :

```env
# OBLIGATOIRES
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/ge_energy

# SSL base de données
# DB_SSL=true   si PostgreSQL est sur un autre serveur
# DB_SSL=false  si PostgreSQL est sur le même serveur (localhost)
DB_SSL=false

# Sécurité admin
ADMIN_SETUP_TOKEN=ChoisisUnTokenSecretIci

# NOWPayments (paiements crypto)
NOWPAYMENTS_API_KEY=votre_cle_api
NOWPAYMENTS_IPN_SECRET=votre_secret_ipn
NOWPAYMENTS_PASSWORD=votre_mot_de_passe_nowpayments
NOWPAYMENTS_WEBHOOK_URL=https://votredomaine.com/api/nowpayments/webhook

# Supabase (pour le panneau admin uniquement)
VITE_SUPABASE_PROJECT_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key
```

---

## Étape 4 — Démarrer le serveur

Commande de démarrage dans Plesk :
```bash
node dist/index.cjs
```

Ou via `npm start` (équivalent) :
```bash
npm start
```

Le serveur démarre sur le `PORT` configuré. Si `PORT` n'est pas défini, il démarre sur **3000**.

---

## Étape 5 — Créer le premier admin

Une seule fois après le déploiement, exécuter cette requête POST :

```bash
curl -X POST https://votredomaine.com/api/auth/admin-setup \
  -H "Content-Type: application/json" \
  -d '{
    "token": "ChoisisUnTokenSecretIci",
    "phone": "votre_numero",
    "password": "VotreMotDePasse"
  }'
```

Ou depuis votre navigateur avec Postman / Insomnia.

> Le `token` doit correspondre à `ADMIN_SETUP_TOKEN` dans vos variables d'environnement.

---

## Étape 6 — Vérification

```bash
# Santé du serveur
curl https://votredomaine.com/api/healthz
# → {"status":"ok"}

# Frontend React
curl -I https://votredomaine.com/
# → HTTP/2 200
```

---

## Version Node.js requise

**Node.js 18 ou supérieur** (recommandé : 20+)

Sur Plesk → Node.js → choisir la version.

---

## Structure des fichiers après git pull

```
dist/
  index.cjs        ← point d'entrée (node dist/index.cjs)
  index.mjs        ← bundle serveur
  pino-*.mjs       ← worker logs
  public/          ← frontend React compilé
    index.html
    assets/
database-setup.sql ← script SQL à exécuter sur votre DB
DEPLOIEMENT.md     ← ce fichier
```

---

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `Error: DATABASE_URL must be set` | Variable manquante | Ajouter `DATABASE_URL` |
| `Error: relation "profiles" does not exist` | Tables non créées | Exécuter `database-setup.sql` |
| Écran blanc | `NODE_ENV` pas en production | Vérifier `NODE_ENV=production` |
| `EADDRINUSE` | Port déjà utilisé | Changer `PORT` |
| Login échoue toujours | Aucun compte créé | Appeler `/api/auth/admin-setup` |
| NOWPayments ne fonctionne pas | Clé API manquante | Vérifier `NOWPAYMENTS_API_KEY` |
| DB SSL error | Postgres sur serveur distant | Mettre `DB_SSL=true` |
