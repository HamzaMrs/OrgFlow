-- OrgFlow schema bootstrap
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'employee');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('todo', 'in_progress', 'done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'employee',
    job_title TEXT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status project_status NOT NULL DEFAULT 'todo',
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    start_date DATE,
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_members (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'todo',
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);

-- Auto-bump updated_at on every row update so route handlers don't have to
-- remember to set `updated_at = NOW()` themselves.
CREATE OR REPLACE FUNCTION bump_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_users_bump_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION bump_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_projects_bump_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION bump_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_tasks_bump_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION bump_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed data
INSERT INTO departments (id, name, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Engineering', 'Product engineering team'),
  ('22222222-2222-2222-2222-222222222222', 'Design', 'Product and brand design'),
  ('33333333-3333-3333-3333-333333333333', 'Operations', 'People and operations')
ON CONFLICT (name) DO NOTHING;

-- Seed accounts share the password: "password"
-- bcrypt hash for "password" (cost 10)
INSERT INTO users (id, name, email, password_hash, role, job_title, department_id) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Ada Admin',
   'admin@orgflow.local',
   '$2a$10$CkPb0KpnyM6TreecjLlGcOn93B1qey3OGnL7m1poBD834ihFJtms6',
   'admin',
   'Platform Admin',
   '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'Morgan Manager',
   'manager@orgflow.local',
   '$2a$10$CkPb0KpnyM6TreecjLlGcOn93B1qey3OGnL7m1poBD834ihFJtms6',
   'manager',
   'Engineering Manager',
   '11111111-1111-1111-1111-111111111111'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   'Evan Employee',
   'employee@orgflow.local',
   '$2a$10$CkPb0KpnyM6TreecjLlGcOn93B1qey3OGnL7m1poBD834ihFJtms6',
   'employee',
   'Software Engineer',
   '11111111-1111-1111-1111-111111111111')
ON CONFLICT (email) DO NOTHING;
