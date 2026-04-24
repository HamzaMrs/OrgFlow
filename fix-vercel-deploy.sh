#!/usr/bin/env bash
#
# OrgFlow — fix déploiement Vercel (à lancer en local dans le repo).
#
# Prérequis: npm i -g vercel  ->  vercel login  ->  vercel link (choisir le projet org-flow-eight)
#
set -euo pipefail

# --- Valeurs ---------------------------------------------------------------
SUPABASE_DB_PASSWORD="Hamzmz.31200"
SUPABASE_REF="vcclbnfzanogymbkcfme"
DATABASE_URL="postgresql://postgres.${SUPABASE_REF}:${SUPABASE_DB_PASSWORD}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
JWT_SECRET="eabb3b673f65532ff45207540390b7f8262da82f1274b45f19a8a495d6a29b65"  # 32-byte hex
CORS_ORIGIN="https://org-flow-eight.vercel.app"
NODE_ENV="production"

# --- 1) Env vars sur la scope Production ----------------------------------
# (vercel env add lit la valeur sur stdin, c'est pourquoi on pipe)
echo "Setting DATABASE_URL...";  printf '%s' "$DATABASE_URL"  | vercel env add DATABASE_URL production  --force --sensitive
echo "Setting JWT_SECRET...";    printf '%s' "$JWT_SECRET"    | vercel env add JWT_SECRET   production  --force --sensitive
echo "Setting CORS_ORIGIN...";   printf '%s' "$CORS_ORIGIN"   | vercel env add CORS_ORIGIN  production  --force
echo "Setting NODE_ENV...";      printf '%s' "$NODE_ENV"      | vercel env add NODE_ENV     production  --force

# --- 2) Redeploy production ------------------------------------------------
vercel --prod --yes

# --- 3) Validation ---------------------------------------------------------
BASE="https://org-flow-eight.vercel.app"
echo; echo "== health =="
curl -sS "$BASE/_/backend/api/health"; echo
echo "== login =="
curl -sS -X POST "$BASE/_/backend/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@orgflow.local","password":"password"}'
echo
echo; echo "Ouvre $BASE/login dans Safari et connecte-toi (admin@orgflow.local / password)."
