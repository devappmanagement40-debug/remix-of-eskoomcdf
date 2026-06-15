#!/usr/bin/env bash
# =============================================================
# deploy.sh — Script de déploiement GE Energy (Plesk / VPS)
# Usage : bash deploy.sh
# =============================================================
set -e

echo ""
echo "=============================="
echo "  GE Energy — Déploiement"
echo "=============================="
echo ""

# Aller à la racine du projet (là où se trouve ce script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
echo "▸ Répertoire : $SCRIPT_DIR"

# 1. Vérifier Node.js (≥ 20 requis pour --env-file)
if ! command -v node &>/dev/null; then
  echo "❌ Node.js introuvable. Installez Node.js 20+ via nvm ou votre panel Plesk."
  exit 1
fi
NODE_VER=$(node -v)
NODE_MAJOR=$(node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
echo "▸ Node.js : $NODE_VER"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "❌ Node.js 20+ requis (version actuelle : $NODE_VER)"
  exit 1
fi

# 2. Vérifier / installer pnpm
if ! command -v pnpm &>/dev/null; then
  echo "▸ Installation de pnpm..."
  npm install -g pnpm@10
fi
echo "▸ pnpm : $(pnpm -v)"

# 3. Installer les dépendances
echo ""
echo "▸ Installation des dépendances..."
pnpm install --frozen-lockfile

# 4. Vérifier les variables d'environnement critiques
# Charger .env si présent (Node 20+ : --env-file géré au démarrage)
if [ -f ".env" ]; then
  echo "▸ Fichier .env trouvé ✅"
  # Charger pour le reste du script bash
  set -a
  # shellcheck disable=SC1091
  source .env 2>/dev/null || true
  set +a
else
  echo "⚠️  Pas de fichier .env — assurez-vous que les variables sont configurées dans Plesk."
  echo "   → Copiez .env.example en .env et remplissez DATABASE_URL"
fi

if [ -z "$DATABASE_URL" ]; then
  echo ""
  echo "⚠️  ATTENTION : DATABASE_URL n'est pas défini !"
  echo "   L'application ne pourra pas se connecter à la base de données."
  echo ""
fi

# 5. Créer les dossiers nécessaires
mkdir -p logs dist/public public/uploads

# 6. Construire le frontend (React → dist/public/)
echo ""
echo "▸ Build du frontend..."
pnpm --filter @workspace/eskom run build
echo "   ✅ Frontend compilé dans dist/public/"

# 7. Construire le serveur API (Express → dist/index.mjs + dist/index.cjs)
echo "▸ Build du serveur API..."
node build.mjs
echo "   ✅ Serveur compilé dans dist/index.cjs"

# 8. Vérifier que les fichiers critiques existent
echo ""
echo "▸ Vérification des fichiers compilés..."
[ -f "dist/index.cjs" ]     && echo "   ✅ dist/index.cjs" || { echo "   ❌ dist/index.cjs MANQUANT"; exit 1; }
[ -f "dist/index.mjs" ]     && echo "   ✅ dist/index.mjs" || { echo "   ❌ dist/index.mjs MANQUANT"; exit 1; }
[ -f "dist/public/index.html" ] && echo "   ✅ dist/public/index.html" || { echo "   ❌ dist/public/index.html MANQUANT"; exit 1; }

# 9. Redémarrer via PM2 si disponible
if command -v pm2 &>/dev/null; then
  echo ""
  echo "▸ Redémarrage via PM2..."
  if pm2 describe ge-energy &>/dev/null 2>&1; then
    pm2 reload ge-energy --update-env
  else
    pm2 start ecosystem.config.cjs
  fi
  pm2 save
  echo "   ✅ Application redémarrée avec PM2"
else
  echo ""
  echo "ℹ️  PM2 non détecté."
  echo "   Pour démarrer manuellement :"
  if [ -f ".env" ]; then
    echo "   NODE_ENV=production node --env-file=.env dist/index.cjs"
  else
    echo "   NODE_ENV=production node dist/index.cjs"
  fi
  echo ""
  echo "   Pour installer PM2 :"
  echo "   npm install -g pm2 && pm2 start ecosystem.config.cjs && pm2 save && pm2 startup"
fi

echo ""
echo "=============================="
echo "  ✅ Déploiement terminé !"
echo "=============================="
echo ""
