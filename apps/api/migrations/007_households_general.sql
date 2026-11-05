-- Any family: registration by invitation, a scan quota per household, and scan usage by month.
create table household_invites (
  code text primary key,
  created_by uuid references users(id) on delete set null,
  note text,
  email text,
  expires_at timestamptz not null,
  used_by uuid references users(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table households add column scan_quota int not null default 60;
create table scan_usage (
  household_id uuid not null references households(id) on delete cascade,
  month text not null,                                   -- YYYY-MM
  n int not null default 0,
  primary key (household_id, month)
);
