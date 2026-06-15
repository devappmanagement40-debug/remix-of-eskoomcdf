# Guide de déploiement Plesk — GE Energy

## Architecture

- **Base de données** : Supabase PostgreSQL (unique, partagée entre Replit et Plesk)
- **Frontend** : React compilé dans `dist/public/`
- **Backend** : Express API compilé dans `dist/index.cjs`

---

## Étape 1 — Variables d'environnement

Dans Plesk → Node.js → Variables d'environnement (ou fichier `.env`) :

```env
# OBLIGATOIRES
NODE_ENV=production
PORT=3000

# Base de données Supabase (UNIQUE base de données)
SUPABASE_DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# Sécurité admin
ADMIN_SETUP_TOKEN=ChoisisUnTokenSecretIci

# NOWPayments (paiements crypto)
NOWPAYMENTS_API_KEY=votre_cle_api
NOWPAYMENTS_IPN_SECRET=votre_secret_ipn
NOWPAYMENTS_PASSWORD=votre_mot_de_passe_nowpayments
NOWPAYMENTS_WEBHOOK_URL=https://votredomaine.com/api/nowpayments/webhook
```

---

## Étape 2 — Déployer depuis GitHub

```bash
# Sur votre serveur Plesk via SSH
git pull origin main

# Démarrer le serveur
node dist/index.cjs
```

Le serveur démarre sur le PORT configuré (défaut : **3000**).

---

## Étape 3 — Accès admin

URL secrète (à garder confidentielle) :
```
https://votredomaine.com/#/admin/827728389992871772661616161626€
```

Identifiants admin :
- Email : `mouhamadoutraore225@gmail.com`
- Mot de passe : `44605058`

---

## Étape 4 — Vérification

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
  public/          ← frontend React compilé
    index.html
    assets/
DEPLOIEMENT.md     ← ce fichier
```

---

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `SUPABASE_DATABASE_URL est requis` | Variable manquante | Ajouter `SUPABASE_DATABASE_URL` |
| Écran blanc | `NODE_ENV` pas en production | Vérifier `NODE_ENV=production` |
| `EADDRINUSE` | Port déjà utilisé | Changer `PORT` |
| Login échoue toujours | Mauvais identifiants | Vérifier email + mot de passe |
| NOWPayments ne fonctionne pas | Clé API manquante | Vérifier `NOWPAYMENTS_API_KEY` |
| DB SSL error | Supabase nécessite SSL | SSL activé automatiquement |
