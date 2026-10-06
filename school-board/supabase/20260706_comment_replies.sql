-- Add YouTube-style replies to comments.
alter table if exists public.comments
add column if not exists parent_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'comments_parent_id_fkey'
      and conrelid = 'public.comments'::regclass
  ) then
    alter table public.comments
    add constraint comments_parent_id_fkey
    foreign key (parent_id)
    references public.comments(id)
    on delete cascade;
  end if;
end $$;

create index if not exists comments_parent_created_idx
on public.comments (parent_id, created_at asc);

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
add constraint notifications_type_check
check (type in ('comment', 'reply', 'comment_reply', 'like', 'report', 'dm'));
