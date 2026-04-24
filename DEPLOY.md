# Déployer OrgFlow sur Vercel + Supabase

## 1. Créer la base Supabase

1. Aller sur [supabase.com](https://supabase.com) → **New project**
2. Noter le **Project password** (on en aura besoin pour la connection string)
3. Attendre que le projet soit prêt (≈2 min)

## 2. Charger le schéma + les données de démo

1. Dans le dashboard Supabase → **SQL Editor** → **New query**
2. Copier/coller le contenu de `backend/src/db/init.sql`
3. **Run**

Les comptes démo seront créés :

| Email | Mot de passe | Rôle |
|---|---|---|
| `admin@orgflow.local` | `password` | admin |
| `manager@orgflow.local` | `password` | manager |
| `employee@orgflow.local` | `password` | employee |

## 3. Récupérer la connection string

1. Supabase → **Project Settings** → **Database**
2. Section **Connection string** → choisir **Transaction pooler** (port 6543)
3. Copier l'URI, remplacer `[YOUR-PASSWORD]` par le mot de passe du projet

Format :
```
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

## 4. Configurer les variables d'environnement Vercel

Dashboard Vercel → projet → **Settings** → **Environment Variables**. Ajouter pour **Production** :

| Nom | Valeur |
|---|---|
| `DATABASE_URL` | La connection string de l'étape 3 |
| `JWT_SECRET` | Une chaîne aléatoire (≥32 caractères, ex: `openssl rand -hex 32`) |
| `CORS_ORIGIN` | `https://org-flow-eight.vercel.app` |
| `NODE_ENV` | `production` |

**Scope** : appliquer ces variables au service `backend` (onglet "Affects" si `experimentalServices` propose le filtrage par service, sinon toute l'app).

## 5. Redéployer

Vercel → **Deployments** → cliquer sur les 3 points du dernier déploiement → **Redeploy**.

## 6. Vérifier

```bash
curl https://org-flow-eight.vercel.app/_/backend/api/health
# → {"status":"ok","service":"orgflow-api","time":"..."}
```

Puis se connecter sur [org-flow-eight.vercel.app/login](https://org-flow-eight.vercel.app/login) avec `admin@orgflow.local` / `password`.

## Troubleshooting

- **`FUNCTION_INVOCATION_FAILED`** → `DATABASE_URL` manquante ou invalide, vérifier l'étape 4
- **Page blanche après login** → le backend plante sur une requête (souvent DB), ouvrir la console navigateur (F12) et regarder l'onglet Network pour identifier la route qui renvoie 500
- **CORS error** → ajouter l'origine manquante à `CORS_ORIGIN` (séparée par virgules)
- **Tables vides** → re-run le SQL de l'étape 2 dans Supabase
