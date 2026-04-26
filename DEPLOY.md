# Déployer OrgFlow

Architecture : **frontend sur Vercel**, **backend sur Render**, **DB sur Supabase**, **emails via Resend**.

---

## 1. Base Supabase

1. [supabase.com](https://supabase.com) → **New project** → noter le mot de passe DB
2. Attendre ~2 min que le projet soit prêt
3. **SQL Editor** → **New query** → coller `backend/src/db/init.sql` → **Run**
4. **SQL Editor** → **New query** → coller `backend/src/db/migrations/001_email_auth.sql` → **Run**
   (ajoute les colonnes/tables pour la vérification d'email, le reset de mot de passe et les invitations)
5. **Project Settings** → **Database** → **Connection string** → **Transaction pooler** (port `6543`)

Format final :
```
postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

⚠️ Échapper `@`, `#`, `:`, `/`, `?`, `&`, `+`, espace dans le password (URL-encoding).

---

## 2. Resend (envoi d'emails)

1. [resend.com](https://resend.com) → Sign up
2. **API Keys** → **Create API Key** → name `orgflow-prod`, full access → copier la clé `re_...`
3. **Mode test** : Resend autorise par défaut l'envoi **uniquement à l'email de ton compte** depuis `onboarding@resend.dev`. Suffit pour valider le flow.
4. **Mode prod** : pour envoyer à n'importe qui, ajouter un domaine vérifié dans **Domains** (3 enregistrements DNS), puis utiliser `noreply@tondomaine.com` comme `EMAIL_FROM`.

---

## 3. Backend sur Render

1. [render.com](https://render.com) → **New** → **Web Service** → connecter le repo GitHub
2. Render lit `render.yaml` automatiquement
3. **Environment Variables** :

| Nom | Valeur |
|---|---|
| `DATABASE_URL` | La connection string Supabase de l'étape 1 |
| `JWT_SECRET` | `openssl rand -hex 32` (≥32 caractères) |
| `CORS_ORIGIN` | `https://<ton-app>.vercel.app` |
| `RESEND_API_KEY` | La clé `re_...` de l'étape 2 |
| `EMAIL_FROM` | `OrgFlow <onboarding@resend.dev>` (test) ou `OrgFlow <noreply@tondomaine.com>` (prod) |
| `APP_URL` | `https://<ton-app>.vercel.app` (utilisé dans les liens des emails) |

4. **Create Web Service** → attendre le build (~3 min)
5. Récupérer l'URL : `https://orgflow-api-XXXX.onrender.com`
6. Tester : `https://orgflow-api-XXXX.onrender.com/api/health` → `{"status":"ok",...}`

---

## 4. Frontend sur Vercel

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → importer le repo
2. **Settings → Environment Variables** :
   - `VITE_API_URL` = `https://orgflow-api-XXXX.onrender.com/api`
3. **Deployments** → Redeploy (les `VITE_*` sont incorporées au build, donc obligatoire après changement)
4. Récupérer l'URL Vercel et la mettre dans `CORS_ORIGIN` + `APP_URL` côté Render → Render redeploy auto

---

## 5. Premier admin

Le code détecte automatiquement quand la table `users` est vide : **le premier compte créé via `/register` devient admin**. Donc :

1. Va sur `https://<ton-app>.vercel.app/register`
2. Crée ton compte avec ton vrai email
3. Tu es admin direct
4. Vérifie ton email (lien dans la boîte de réception)
5. Va dans **Équipe** → **Inviter** pour ajouter d'autres membres

---

## 6. Vérifier

```bash
# backend
curl https://orgflow-api-XXXX.onrender.com/api/health

# frontend
open https://<ton-app>.vercel.app
```

---

## Troubleshooting

| Symptôme | Cause | Fix |
|---|---|---|
| Backend `JWT_SECRET must be at least 32 characters` | Secret trop court | `openssl rand -hex 32` puis update dans Render |
| Backend `Missing required env var: DATABASE_URL` | Variable absente | Re-vérifier, redeploy |
| Backend `TypeError: Invalid URL` au démarrage | password contient `@`, `#`, `:` non encodé | URL-encoder ou regénérer un password sans caractères spéciaux |
| Frontend page blanche, console : `CORS blocked` | `CORS_ORIGIN` Render ne match pas | Mettre l'URL Vercel exacte → redeploy |
| Frontend appelle `localhost:4000` en prod | `VITE_API_URL` absent | Ajouter sur Vercel + **redeploy** |
| Email reçu mais le lien pointe vers localhost | `APP_URL` non défini sur Render | Mettre l'URL Vercel + redeploy |
| Email pas reçu | Mode test Resend → uniquement ton email Resend | Ajouter un domaine vérifié dans Resend |
| Login OK mais 401 sur tout le reste (Safari/Brave) | Cookies cross-domain bloqués | Déjà géré : Bearer token via Authorization header |
| 1ère requête après inactivité prend 30s | Plan Free Render qui se réveille | Normal en Free, upgrade pour éviter |

---

## Re-déployer

- **Backend** : push sur `main` → Render redeploy auto
- **Frontend** : push sur `main` → Vercel redeploy auto  
- **Schéma DB modifié** : ajouter une nouvelle migration `0XX_xxx.sql` dans `backend/src/db/migrations/` et la lancer dans le SQL Editor Supabase
