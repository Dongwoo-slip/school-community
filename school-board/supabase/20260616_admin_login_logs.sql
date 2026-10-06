-- Square admin login audit logs.
-- Run this in the Supabase SQL Editor before deploying the matching Next.js code.

begin;

create extension if not exists pgcrypto;

create table if not exists public.admin_login_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  username text,
  login_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  device_label text,
  browser text,
  os text,
  platform text,
  screen text,
  language text,
  timezone text,
  created_at timestamptz not null default now()
);

alter table public.admin_login_logs
  add column if not exists admin_id uuid references auth.users(id) on delete set null,
  add column if not exists username text,
  add column if not exists login_at timestamptz not null default now(),
  add column if not exists ip_address text,
  add column if not exists user_agent text,
  add column if not exists device_label text,
  add column if not exists browser text,
  add column if not exists os text,
  add column if not exists platform text,
  add column if not exists screen text,
  add column if not exists language text,
  add column if not exists timezone text,
  add column if not exists created_at timestamptz not null default now();

create index if not exists admin_login_logs_login_at_idx
on public.admin_login_logs (login_at desc);

create index if not exists admin_login_logs_admin_id_idx
on public.admin_login_logs (admin_id, login_at desc);

alter table public.admin_login_logs enable row level security;

revoke all on table public.admin_login_logs from anon;
revoke all on table public.admin_login_logs from authenticated;
grant all on table public.admin_login_logs to service_role;

notify pgrst, 'reload schema';

commit;
