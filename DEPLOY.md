# Déployer OrgFlow

Architecture : **frontend sur Vercel**, **backend sur Render**, **DB sur Supabase**.
C'est le pattern standard et fiable pour un Node + React. Vercel est top pour les SPA mais leurs fonctions serverless en monorepo TypeScript sont galère — d'où le découplage.

---

## 1. Base Supabase

1. [supabase.com](https://supabase.com) → **New project** → noter le mot de passe DB
2. Attendre ~2 min que le projet soit prêt
3. **SQL Editor** → **New query** → coller `backend/src/db/init.sql` → **Run**
4. **Project Settings** → **Database** → **Connection string** → **Transaction pooler** (port `6543`) → copier l'URI, remplacer `[YOUR-PASSWORD]`

Format final :
```
postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

Comptes seed disponibles après le SQL :

| Email | Mot de passe | Rôle |
|---|---|---|
| `admin@orgflow.local` | `password` | admin |
| `manager@orgflow.local` | `password` | manager |
| `employee@orgflow.local` | `password` | employee |

---

## 2. Backend sur Render

1. [render.com](https://render.com) → **New** → **Web Service** → connecter le repo GitHub
2. Render détecte automatiquement `render.yaml` à la racine — accepte la config proposée
3. Dans les **Environment Variables** du service, ajouter (les 3 variables marquées `sync: false`) :
   - `DATABASE_URL` = la connection string Supabase de l'étape 1
   - `JWT_SECRET` = générer avec `openssl rand -hex 32` (≥32 caractères, sinon le service refuse de démarrer)
   - `CORS_ORIGIN` = `https://<ton-app>.vercel.app` (l'URL Vercel du frontend, mise à jour à l'étape 3)
4. **Create Web Service** → attendre le build (~3 min)
5. Récupérer l'URL publique : `https://orgflow-api-XXXX.onrender.com`
6. Tester : `https://orgflow-api-XXXX.onrender.com/api/health` → `{"status":"ok",...}`

⚠️ Le plan Free met le service en veille après 15 min d'inactivité — la première requête après veille prend ~30s. C'est pas grave en démo, à upgrader pour de la prod.

---

## 3. Frontend sur Vercel

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → importer le repo
2. Vercel lit `vercel.json` à la racine et build le frontend automatiquement
3. **Settings → Environment Variables** → ajouter :
   - `VITE_API_URL` = `https://orgflow-api-XXXX.onrender.com/api` (l'URL Render + `/api`)
4. **Redeploy** (sinon la nouvelle env var n'est pas prise)
5. Récupérer l'URL Vercel : `https://<ton-app>.vercel.app`
6. **Retourner sur Render** et mettre à jour `CORS_ORIGIN` avec cette URL → redeploy automatique

---

## 4. Vérifier

```bash
# backend
curl https://orgflow-api-XXXX.onrender.com/api/health

# frontend
open https://<ton-app>.vercel.app
# Login : admin@orgflow.local / password
```

---

## Troubleshooting

| Symptôme | Cause probable | Fix |
|---|---|---|
| Backend `JWT_SECRET must be at least 32 characters` au démarrage | Secret trop court | `openssl rand -hex 32` puis update dans Render |
| Backend `Missing required env var: DATABASE_URL` | Variable pas dans Render | Re-vérifier, redeploy |
| Frontend page blanche, console : `CORS blocked` | `CORS_ORIGIN` ne contient pas l'URL Vercel | Ajouter dans Render → redeploy |
| Frontend page blanche, Network montre 401 | Cookies `SameSite=lax` cross-domain | Verifier que les 2 URLs sont en HTTPS (c'est le cas par défaut) |
| Frontend appelle `localhost:4000` en prod | `VITE_API_URL` pas définie sur Vercel | Ajouter et **redeploy** (Vercel build incorpore les env vars VITE_* au build) |
| 1ère requête après inactivité prend 30s | Plan Free Render qui se réveille | Normal en Free, upgrade pour éviter |

---

## Re-déployer

- **Backend** : push sur `main` → Render redeploy auto
- **Frontend** : push sur `main` → Vercel redeploy auto
- **Schéma DB modifié** : refaire l'étape 1.3 (le SQL est idempotent)
