-- SquareCJ post activity notifications and iOS push token storage.
-- Run this in the Supabase SQL Editor before deploying the matching Next.js code.

begin;

create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_username text,
  type text not null,
  post_id uuid,
  comment_id uuid,
  reaction_id uuid,
  board text,
  post_title text,
  read boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists recipient_id uuid references auth.users(id) on delete cascade,
  add column if not exists actor_id uuid references auth.users(id) on delete set null,
  add column if not exists actor_username text,
  add column if not exists type text,
  add column if not exists post_id uuid,
  add column if not exists comment_id uuid,
  add column if not exists reaction_id uuid,
  add column if not exists board text,
  add column if not exists post_title text,
  add column if not exists read boolean not null default false,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now();

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'notifications'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%type%'
  loop
    execute format('alter table public.notifications drop constraint if exists %I', constraint_name);
  end loop;
end $$;

alter table public.notifications
  alter column type set not null,
  alter column read set not null,
  alter column read set default false,
  alter column metadata set not null,
  alter column metadata set default '{}'::jsonb,
  alter column created_at set not null,
  alter column created_at set default now();

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('comment', 'reply', 'comment_reply', 'like', 'report', 'dm'));

create index if not exists notifications_recipient_created_idx
on public.notifications (recipient_id, created_at desc);

create index if not exists notifications_recipient_read_idx
on public.notifications (recipient_id, read);

create unique index if not exists notifications_unique_like_actor_post_idx
on public.notifications (recipient_id, actor_id, post_id)
where type = 'like' and actor_id is not null and post_id is not null;

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null default 'ios',
  environment text not null default 'development',
  app_id text not null default 'com.squarecj.app',
  device_id text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  last_sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_tokens
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists token text,
  add column if not exists platform text not null default 'ios',
  add column if not exists environment text not null default 'development',
  add column if not exists app_id text not null default 'com.squarecj.app',
  add column if not exists device_id text,
  add column if not exists enabled boolean not null default true,
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists last_sent_at timestamptz,
  add column if not exists last_error text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.push_tokens
  alter column user_id set not null,
  alter column token set not null,
  alter column platform set not null,
  alter column platform set default 'ios',
  alter column environment set not null,
  alter column environment set default 'development',
  alter column app_id set not null,
  alter column app_id set default 'com.squarecj.app',
  alter column enabled set not null,
  alter column enabled set default true,
  alter column last_seen_at set not null,
  alter column last_seen_at set default now(),
  alter column created_at set not null,
  alter column created_at set default now(),
  alter column updated_at set not null,
  alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'push_tokens_platform_check'
      and conrelid = 'public.push_tokens'::regclass
  ) then
    alter table public.push_tokens
      add constraint push_tokens_platform_check check (platform in ('ios'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'push_tokens_environment_check'
      and conrelid = 'public.push_tokens'::regclass
  ) then
    alter table public.push_tokens
      add constraint push_tokens_environment_check check (environment in ('development', 'production'));
  end if;
end $$;

create unique index if not exists push_tokens_token_idx
on public.push_tokens (token);

create index if not exists push_tokens_user_idx
on public.push_tokens (user_id);

create index if not exists push_tokens_user_active_idx
on public.push_tokens (user_id, environment, enabled);

alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;

revoke all on table public.notifications from anon;
revoke all on table public.push_tokens from anon;

grant select on table public.notifications to authenticated;
grant update (read) on table public.notifications to authenticated;
grant all on table public.notifications to service_role;

grant select, insert, delete on table public.push_tokens to authenticated;
grant update (token, platform, environment, app_id, device_id, enabled, last_seen_at, updated_at) on table public.push_tokens to authenticated;
grant all on table public.push_tokens to service_role;

drop policy if exists "notifications_own_select" on public.notifications;
drop policy if exists "notifications_own_mark_read" on public.notifications;
drop policy if exists "push_tokens_own_select" on public.push_tokens;
drop policy if exists "push_tokens_own_insert" on public.push_tokens;
drop policy if exists "push_tokens_own_update" on public.push_tokens;
drop policy if exists "push_tokens_own_delete" on public.push_tokens;

create policy "notifications_own_select"
on public.notifications
for select
to authenticated
using ((select auth.uid()) = recipient_id);

create policy "notifications_own_mark_read"
on public.notifications
for update
to authenticated
using ((select auth.uid()) = recipient_id)
with check ((select auth.uid()) = recipient_id);

create policy "push_tokens_own_select"
on public.push_tokens
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "push_tokens_own_insert"
on public.push_tokens
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "push_tokens_own_update"
on public.push_tokens
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "push_tokens_own_delete"
on public.push_tokens
for delete
to authenticated
using ((select auth.uid()) = user_id);

commit;
