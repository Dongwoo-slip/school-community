-- Cache timetable API responses so visitors read from DB for one hour.
-- Safe to run repeatedly.

create table if not exists public.timetable_cache (
  cache_key text primary key,
  grade text not null,
  class_nm text not null,
  week_offset integer not null default 0,
  days jsonb not null,
  grid jsonb not null,
  has_data boolean not null default false,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists timetable_cache_expires_idx
on public.timetable_cache (expires_at);
