-- Scholar review workflow: one row per content item that has passed a gate. Global, not per household: the content is the same for everyone.
create table content_reviews (
  key text primary key,                                  -- stable content key, e.g. quran-2-30-39, surah-36, teaching-1a2b3c
  status text not null check (status in ('draft','reviewed','verified','disputed')),
  reviewer_user_id uuid references users(id) on delete set null,
  reviewer_name text not null,
  source text,                                           -- edition, volume and page that was checked
  note text,
  updated_at timestamptz not null default now()
);
create index content_reviews_status_idx on content_reviews(status);
