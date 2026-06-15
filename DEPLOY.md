# Guide de déploiement — GE Energy sur Plesk

## Prérequis sur le serveur

- Node.js **20+** (via Plesk > Node.js ou nvm)
- pnpm (installé automatiquement par le script de déploiement)
- PostgreSQL accessible (URL de connexion)
- Git configuré

---

## 1. Premier déploiement

```bash
# Cloner le dépôt
git clone https://github.com/votre-repo/ge-energy.git /var/www/geenergy
cd /var/www/geenergy

# Créer le fichier .env
cp .env.example .env
nano .env   # Remplir DATABASE_URL et autres variables

# Lancer le script de déploiement
bash deploy.sh
```

---

## 2. Mises à jour (git pull + redémarrage)

```bash
cd /var/www/geenergy
git pull
bash deploy.sh
```

Le script fait automatiquement :
1. `pnpm install` — met à jour les dépendances
2. Build du frontend → `dist/public/`
3. Build du serveur → `dist/index.cjs`
4. Redémarrage via PM2 (si installé)

---

## 3. Configuration Plesk (Node.js)

Dans **Plesk > votre domaine > Node.js** :

| Champ | Valeur |
|-------|--------|
| Node.js version | 20.x |
| Application root | `/var/www/geenergy` |
| Application startup file | `dist/index.cjs` |
| Document root | `/var/www/geenergy` |

**Variables d'environnement à ajouter dans Plesk :**
- `NODE_ENV` = `production`
- `DATABASE_URL` = votre URL PostgreSQL
- `PORT` = le port que Plesk vous assigne (souvent automatique)

---

## 4. Structure des fichiers compilés

```
dist/
├── index.mjs          ← serveur Express (bundle ESM)
├── index.cjs          ← shim CJS pour Plesk (point d'entrée)
├── pino-*.mjs         ← dépendances logger
└── public/            ← frontend React compilé
    ├── index.html
    └── assets/
```

---

## 5. PM2 (optionnel mais recommandé)

```bash
# Installer PM2 globalement
npm install -g pm2

# Démarrer l'application
pm2 start ecosystem.config.cjs

# Démarrage automatique au reboot
pm2 startup
pm2 save

# Voir les logs
pm2 logs ge-energy

# Redémarrer après git pull
git pull && bash deploy.sh
```

---

## 6. Base de données

Le schéma est appliqué via :
```bash
pnpm --filter @workspace/db run push
```

> Exécutez cette commande après chaque modification du schéma DB.

---

## 7. Dépannage

| Problème | Solution |
|----------|----------|
| Page blanche | Vérifier que `dist/public/index.html` existe |
| Erreur 500 | Vérifier `DATABASE_URL` dans les variables d'env |
| Port déjà utilisé | Changer `PORT` dans `.env` |
| Module introuvable | Relancer `pnpm install && bash deploy.sh` |
