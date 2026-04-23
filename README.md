# OrgFlow

A full-stack business management dashboard: projects, teams, departments, analytics, with role-based access control.

**Stack:** React + TypeScript (Vite, Tailwind, Recharts) · Node.js + Express + TypeScript · PostgreSQL 16 · JWT auth · Docker Compose

---

## Features

- **JWT authentication** with role-based access control (`admin`, `manager`, `employee`)
- **Projects** — kanban board, create/edit/delete, assign team members, status workflow (todo / in progress / done)
- **Tasks** — nested under projects with assignees, due dates, status
- **Team management** — employees, roles, job titles, department assignment
- **Departments** — CRUD with member counts
- **Analytics** — pie, bar, stacked bar, line charts (Recharts) covering project distribution, task completion, per-user workload
- **REST API** — feature-based routing, Zod validation, centralized error handling, helmet + CORS
- **Responsive UI** — Tailwind CSS, mobile sidebar, professional design system

---

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

Then open:

- Frontend → <http://localhost:5173>
- Backend API → <http://localhost:4000/api/health>

The Postgres schema and seed data load automatically from `backend/src/db/init.sql` on first startup.

### Seed accounts

All seed users share the password `password`:

| Role     | Email                     |
| -------- | ------------------------- |
| Admin    | `admin@orgflow.local`     |
| Manager  | `manager@orgflow.local`   |
| Employee | `employee@orgflow.local`  |

---

## Project layout

```
OrgFlow/
├── docker-compose.yml
├── .env.example
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts              # Express entry
│       ├── config/env.ts          # Validated env loader
│       ├── db/
│       │   ├── init.sql           # Schema + seed (auto-loaded by Postgres container)
│       │   └── pool.ts            # pg Pool + helpers
│       ├── middleware/            # auth, validate, errorHandler
│       ├── utils/                 # httpError, asyncHandler
│       └── features/              # Feature-based modules
│           ├── auth/
│           ├── users/
│           ├── departments/
│           ├── projects/          # projects + nested tasks
│           └── analytics/
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx                # Routes
        ├── api/client.ts          # Axios + JWT interceptor
        ├── types/models.ts
        ├── components/            # AppLayout, Modal, StatusBadge
        └── features/              # Feature-based modules
            ├── auth/              # AuthContext, LoginPage, RequireAuth
            ├── dashboard/
            ├── projects/
            ├── team/
            ├── departments/
            └── analytics/
```

---

## API reference (summary)

Base URL: `http://localhost:4000/api`

All endpoints except `POST /auth/login` and `POST /auth/register` require `Authorization: Bearer <jwt>`.

| Method | Path                                  | Role          | Description                         |
| ------ | ------------------------------------- | ------------- | ----------------------------------- |
| POST   | `/auth/login`                         | public        | Returns JWT + user                  |
| POST   | `/auth/register`                      | public        | Self-register as employee           |
| GET    | `/auth/me`                            | authed        | Current user                        |
| GET    | `/users`                              | authed        | List all users                      |
| POST   | `/users`                              | admin         | Create user                         |
| PATCH  | `/users/:id`                          | admin/manager | Update user                         |
| DELETE | `/users/:id`                          | admin         | Delete user                         |
| GET    | `/departments`                        | authed        | List departments + member counts    |
| POST   | `/departments`                        | admin/manager | Create department                   |
| PATCH  | `/departments/:id`                    | admin/manager | Update department                   |
| DELETE | `/departments/:id`                    | admin         | Delete department                   |
| GET    | `/projects`                           | authed        | List projects with members & counts |
| POST   | `/projects`                           | admin/manager | Create project                      |
| PATCH  | `/projects/:id`                       | admin/manager | Update project                      |
| DELETE | `/projects/:id`                       | admin/manager | Delete project                      |
| GET    | `/projects/:id/tasks`                 | authed        | List tasks                          |
| POST   | `/projects/:id/tasks`                 | authed        | Create task                         |
| PATCH  | `/projects/:id/tasks/:taskId`         | authed        | Update task                         |
| DELETE | `/projects/:id/tasks/:taskId`         | authed        | Delete task                         |
| GET    | `/analytics/summary`                  | authed        | Counters, status breakdowns, workload |

All inputs are validated with Zod. Errors return a uniform shape:

```json
{ "error": "Validation failed", "details": [{ "path": "email", "message": "Invalid email" }] }
```

---

## Environment variables

See `.env.example`.

| Variable           | Purpose                                     |
| ------------------ | ------------------------------------------- |
| `POSTGRES_USER`    | DB user                                     |
| `POSTGRES_PASSWORD`| DB password                                 |
| `POSTGRES_DB`      | DB name                                     |
| `POSTGRES_PORT`    | Host port for Postgres (default 5432)       |
| `BACKEND_PORT`     | Host port for the API (default 4000)        |
| `FRONTEND_PORT`    | Host port for the web app (default 5173)    |
| `JWT_SECRET`       | **Change this in production**               |
| `JWT_EXPIRES_IN`   | e.g. `7d`                                   |
| `CORS_ORIGIN`      | Comma-separated allowed origins             |
| `VITE_API_URL`     | API base URL used by the frontend           |

---

## Local development (without Docker)

```bash
# DB
docker run --rm -p 5432:5432 -e POSTGRES_PASSWORD=orgflow -e POSTGRES_USER=orgflow -e POSTGRES_DB=orgflow \
  -v "$PWD/backend/src/db/init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro" \
  postgres:16-alpine

# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

---

## Security notes

- Passwords hashed with bcrypt (cost 10)
- JWT signed with `JWT_SECRET` — set a long random value in production
- `helmet` sets secure response headers
- All mutation endpoints are protected by `requireAuth` and role checks
- Zod parses and strips request payloads before handlers run

---

## License

MIT
