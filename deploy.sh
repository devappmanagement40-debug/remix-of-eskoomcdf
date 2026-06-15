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

# 1. Vérifier Node.js
NODE_VER=$(node -v 2>/dev/null || echo "absent")
echo "▸ Node.js : $NODE_VER"
if ! command -v node &>/dev/null; then
  echo "❌ Node.js introuvable. Installez Node.js 20+ via nvm ou votre panel Plesk."
  exit 1
fi

# 2. Vérifier / installer pnpm
if ! command -v pnpm &>/dev/null; then
  echo "▸ Installation de pnpm..."
  npm install -g pnpm@latest
fi
echo "▸ pnpm : $(pnpm -v)"

# 3. Installer les dépendances
echo ""
echo "▸ Installation des dépendances..."
pnpm install --frozen-lockfile

# 4. Vérifier les variables d'environnement critiques
if [ -z "$DATABASE_URL" ]; then
  echo ""
  echo "⚠️  ATTENTION : DATABASE_URL n'est pas défini."
  echo "   Définissez-le dans votre panel Plesk > Node.js > Variables d'environnement"
  echo "   ou dans le fichier .env à la racine du projet."
  echo ""
fi

# 5. Construire le frontend (React → dist/public/)
echo "▸ Build du frontend..."
pnpm --filter @workspace/eskom run build
echo "   ✅ Frontend compilé dans dist/public/"

# 6. Construire le serveur API (Express → dist/index.mjs + dist/index.cjs)
echo "▸ Build du serveur API..."
node build.mjs
echo "   ✅ Serveur compilé dans dist/index.cjs"

# 7. Redémarrer via PM2 si disponible
if command -v pm2 &>/dev/null; then
  echo ""
  echo "▸ Redémarrage via PM2..."
  if pm2 describe ge-energy &>/dev/null; then
    pm2 reload ge-energy --update-env
  else
    pm2 start ecosystem.config.cjs
  fi
  pm2 save
  echo "   ✅ Application redémarrée avec PM2"
else
  echo ""
  echo "ℹ️  PM2 non détecté. Démarrez l'app manuellement :"
  echo "   NODE_ENV=production node dist/index.cjs"
fi

echo ""
echo "=============================="
echo "  ✅ Déploiement terminé !"
echo "=============================="
echo ""
