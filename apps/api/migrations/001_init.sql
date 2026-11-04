-- OnePlate schema v1. Every household-scoped row carries household_id so authorisation is one predicate.
create extension if not exists pgcrypto;
create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table sessions (
  id text primary key,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  user_agent text
);
create index sessions_user_idx on sessions(user_id);
create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references users(id),
  timezone text not null default 'Asia/Karachi',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create type access_level as enum ('owner','contributor','viewer');
create table memberships (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  level access_level not null,
  member_id text, -- which family member this user is (e.g. 'uzma'); null for viewers
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create table invites (
  code text primary key,
  household_id uuid not null references households(id) on delete cascade,
  level access_level not null,
  member_id text,
  expires_at timestamptz not null,
  used_by uuid references users(id),
  created_at timestamptz not null default now()
);
-- Generic versioned documents: the same shape the artifact database serves today (collection/doc_id/body/version).
create table documents (
  household_id uuid not null references households(id) on delete cascade,
  collection text not null,
  doc_id text not null,
  body jsonb not null,
  version integer not null default 1,
  updated_by uuid references users(id),
  updated_at timestamptz not null default now(),
  primary key (household_id, collection, doc_id)
);
create index documents_updated_idx on documents(household_id, updated_at);
create table audit_events (
  id bigserial primary key,
  household_id uuid references households(id) on delete cascade,
  user_id uuid references users(id),
  action text not null,
  collection text,
  doc_id text,
  version integer,
  ip inet,
  at timestamptz not null default now()
);
create index audit_household_idx on audit_events(household_id, at);
