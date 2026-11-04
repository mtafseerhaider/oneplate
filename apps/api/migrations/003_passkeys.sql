create table passkeys (
  id text primary key,                 -- credential id (base64url)
  user_id uuid not null references users(id) on delete cascade,
  public_key bytea not null,
  counter bigint not null default 0,
  transports text[] not null default '{}',
  device_type text,
  backed_up boolean not null default false,
  label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index passkeys_user_idx on passkeys(user_id);
create table webauthn_challenges (
  id text primary key,
  user_id uuid references users(id) on delete cascade,
  challenge text not null,
  kind text not null check (kind in ('register','login')),
  expires_at timestamptz not null
);
