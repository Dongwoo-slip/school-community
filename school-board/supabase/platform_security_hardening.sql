-- Supabase platform hardening for Square.
-- Run this in Supabase SQL Editor for project oqgbsjyzbhyvtwtmieyo.
--
-- Goal:
-- 1) Browser publishable/anon keys cannot directly delete posts or edit roles.
-- 2) profiles.role and student verification fields are not client-updatable.
-- 3) Student verification codes, deleted logs, and site stats stay server-only.
--
-- The app's Next.js API routes use SUPABASE_SERVICE_ROLE_KEY on the server, so
-- service_role keeps full access. Do not expose the service role key in browser code.

begin;

-- Profiles: users may read their own row and update only harmless profile fields.
alter table if exists public.profiles enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;

grant select on table public.profiles to authenticated;
grant insert (id, username, grade, class_no, interests) on table public.profiles to authenticated;
grant update (username, grade, class_no, interests) on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

drop policy if exists "profiles_own_select" on public.profiles;
drop policy if exists "profiles_own_insert_limited" on public.profiles;
drop policy if exists "profiles_own_update_limited" on public.profiles;

create policy "profiles_own_select"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_own_insert_limited"
on public.profiles
for insert
to authenticated
with check (
  (select auth.uid()) = id
  and coalesce(role, 'user') = 'user'
  and coalesce(student_verified, false) = false
  and student_no is null
  and student_name is null
  and verification_code_id is null
);

create policy "profiles_own_update_limited"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Posts are accessed through server API routes. Direct browser DB access stays closed.
alter table if exists public.posts enable row level security;
revoke all on table public.posts from anon;
revoke all on table public.posts from authenticated;
grant all on table public.posts to service_role;

-- Student verification codes contain names/codes. Keep all direct access server-only.
alter table if exists public.student_verification_codes enable row level security;
revoke all on table public.student_verification_codes from anon;
revoke all on table public.student_verification_codes from authenticated;
grant all on table public.student_verification_codes to service_role;

-- Deleted logs, private notifications, and stats should not be enumerable directly.
alter table if exists public.deleted_posts enable row level security;
revoke all on table public.deleted_posts from anon;
revoke all on table public.deleted_posts from authenticated;
grant all on table public.deleted_posts to service_role;

alter table if exists public.site_stats enable row level security;
revoke all on table public.site_stats from anon;
revoke all on table public.site_stats from authenticated;
grant all on table public.site_stats to service_role;

alter table if exists public.notifications enable row level security;
revoke all on table public.notifications from anon;
revoke all on table public.notifications from authenticated;
grant all on table public.notifications to service_role;

-- Direct DM table access: participants only. Server API still has service_role access.
alter table if exists public.messages enable row level security;

drop policy if exists "messages_participant_read" on public.messages;
drop policy if exists "messages_sender_insert" on public.messages;
drop policy if exists "messages_receiver_update_read" on public.messages;

create policy "messages_participant_read"
on public.messages
for select
to authenticated
using ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id or (select auth.uid()) = recipient_id);

create policy "messages_sender_insert"
on public.messages
for insert
to authenticated
with check ((select auth.uid()) = sender_id);

create policy "messages_receiver_update_read"
on public.messages
for update
to authenticated
using ((select auth.uid()) = receiver_id or (select auth.uid()) = recipient_id)
with check ((select auth.uid()) = receiver_id or (select auth.uid()) = recipient_id);

-- Poll votes may be written by logged-in users only for themselves.
alter table if exists public.poll_votes enable row level security;

drop policy if exists "poll_votes_own_select" on public.poll_votes;
drop policy if exists "poll_votes_own_insert" on public.poll_votes;
drop policy if exists "poll_votes_own_delete" on public.poll_votes;

create policy "poll_votes_own_select"
on public.poll_votes
for select
to authenticated
using ((select auth.uid()) = voter_id);

create policy "poll_votes_own_insert"
on public.poll_votes
for insert
to authenticated
with check ((select auth.uid()) = voter_id);

create policy "poll_votes_own_delete"
on public.poll_votes
for delete
to authenticated
using ((select auth.uid()) = voter_id);

-- My-page timetable preferences.
alter table if exists public.user_profiles enable row level security;

drop policy if exists "user_profiles_own_select" on public.user_profiles;
drop policy if exists "user_profiles_own_insert" on public.user_profiles;
drop policy if exists "user_profiles_own_update" on public.user_profiles;

create policy "user_profiles_own_select"
on public.user_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "user_profiles_own_insert"
on public.user_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "user_profiles_own_update"
on public.user_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

commit;
