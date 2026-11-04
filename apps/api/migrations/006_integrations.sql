-- Integrations: per-person ingest tokens (Apple Health via Shortcuts), web push subscriptions, a send log, and a small key-value table for server keys.
create table ingest_tokens (
  id text primary key,
  token_hash text not null unique,
  household_id uuid not null references households(id) on delete cascade,
  member_id text not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  uses int not null default 0,
  disabled boolean not null default false
);
create index ingest_tokens_household_idx on ingest_tokens(household_id);
create table push_subscriptions (
  id text primary key,
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  member_id text,
  endpoint text not null unique,
  subscription jsonb not null,
  prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz,
  failures int not null default 0
);
create index push_subscriptions_household_idx on push_subscriptions(household_id);
create table push_log (
  household_id uuid not null references households(id) on delete cascade,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (household_id, key)
);
create table kv (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
