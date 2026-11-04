-- Family links: a long random token per family member. Opening it asks for that member's date of birth (from the family document), then signs the device in and offers a passkey.
create table member_links (
  id text primary key,                                    -- short public id, for listing and revoking
  token_hash text not null unique,
  household_id uuid not null references households(id) on delete cascade,
  member_id text not null,
  level access_level not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  uses int not null default 0,
  disabled boolean not null default false
);
create index member_links_household_idx on member_links(household_id);
