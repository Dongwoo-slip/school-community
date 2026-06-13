-- Lock down profile reward fields.
-- Run this in the Supabase SQL Editor.
--
-- This keeps logged-in browser clients from changing their own points, badge,
-- role, or student verification fields through the Supabase REST API. The app's
-- server routes still use SUPABASE_SERVICE_ROLE_KEY, so normal point awards
-- from posting/commenting continue to work.

begin;

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
  and coalesce(points, 0) = 0
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

create or replace function public.prevent_client_profile_reward_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'service_role'
     or session_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;

  if tg_op = 'UPDATE' and (
    new.points is distinct from old.points
    or new.badge is distinct from old.badge
    or new.role is distinct from old.role
    or new.student_verified is distinct from old.student_verified
    or new.student_no is distinct from old.student_no
    or new.student_name is distinct from old.student_name
    or new.student_verified_at is distinct from old.student_verified_at
    or new.verification_code_id is distinct from old.verification_code_id
  ) then
    raise exception 'protected profile fields can only be changed by the server';
  end if;

  if tg_op = 'INSERT' and (
    coalesce(new.points, 0) <> 0
    or coalesce(new.role, 'user') <> 'user'
    or coalesce(new.student_verified, false) <> false
    or new.student_no is not null
    or new.student_name is not null
    or new.student_verified_at is not null
    or new.verification_code_id is not null
  ) then
    raise exception 'protected profile fields can only be set by the server';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_client_profile_reward_update on public.profiles;
create trigger prevent_client_profile_reward_update
before insert or update on public.profiles
for each row
execute function public.prevent_client_profile_reward_update();

commit;

-- Optional checks after running:
-- 1) In the app, create a post/comment and confirm points still increase.
-- 2) From a browser Supabase client, this should fail:
--    supabase.from('profiles').update({ points: 999999 }).eq('id', '<my-user-id>')
