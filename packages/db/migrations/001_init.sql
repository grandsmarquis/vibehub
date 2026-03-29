-- Vibehub schema: users (JWT auth upsert), extension tokens, projects, prompts, stats

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  image TEXT,
  email_verified TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE extension_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX extension_tokens_user_id_idx ON extension_tokens (user_id);
CREATE INDEX extension_tokens_token_hash_idx ON extension_tokens (token_hash);

CREATE TYPE project_visibility AS ENUM ('public', 'private');

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  workspace_key TEXT NOT NULL,
  visibility project_visibility NOT NULL DEFAULT 'private',
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, workspace_key)
);

CREATE INDEX projects_user_id_idx ON projects (user_id);
CREATE INDEX projects_visibility_idx ON projects (visibility);

CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  assistant_body TEXT,
  source TEXT NOT NULL DEFAULT 'cursor_hook',
  conversation_id TEXT,
  generation_id TEXT NOT NULL,
  model TEXT,
  cursor_version TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  raw_submit JSONB,
  raw_completion JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, generation_id)
);

CREATE INDEX prompts_project_id_created_idx ON prompts (project_id, created_at DESC);
CREATE INDEX prompts_user_id_idx ON prompts (user_id);

CREATE TABLE prompt_stats (
  prompt_id UUID PRIMARY KEY REFERENCES prompts (id) ON DELETE CASCADE,
  view_count INTEGER NOT NULL DEFAULT 0,
  copy_count INTEGER NOT NULL DEFAULT 0,
  star_count INTEGER NOT NULL DEFAULT 0
);
