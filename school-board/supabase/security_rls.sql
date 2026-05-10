-- Square security hardening policies.
-- Run in Supabase SQL Editor. These policies keep direct anon REST access closed
-- while still allowing logged-in users to use normal app features.

alter table if exists public.comments enable row level security;
alter table if exists public.chat_messages enable row level security;
alter table if exists public.messages enable row level security;
alter table if exists public.site_stats enable row level security;

drop policy if exists "comments_authenticated_read" on public.comments;
drop policy if exists "comments_own_insert" on public.comments;
drop policy if exists "comments_own_delete" on public.comments;

create policy "comments_authenticated_read"
on public.comments for select
to authenticated
using (true);

create policy "comments_own_insert"
on public.comments for insert
to authenticated
with check (auth.uid() = author_id);

create policy "comments_own_delete"
on public.comments for delete
to authenticated
using (auth.uid() = author_id);

drop policy if exists "chat_authenticated_read" on public.chat_messages;
drop policy if exists "chat_own_insert" on public.chat_messages;
drop policy if exists "chat_own_delete" on public.chat_messages;

create policy "chat_authenticated_read"
on public.chat_messages for select
to authenticated
using (true);

create policy "chat_own_insert"
on public.chat_messages for insert
to authenticated
with check (auth.uid() = user_id);

create policy "chat_own_delete"
on public.chat_messages for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "messages_participant_read" on public.messages;
drop policy if exists "messages_sender_insert" on public.messages;
drop policy if exists "messages_receiver_update_read" on public.messages;

create policy "messages_participant_read"
on public.messages for select
to authenticated
using (auth.uid() = sender_id or auth.uid() = receiver_id or auth.uid() = recipient_id);

create policy "messages_sender_insert"
on public.messages for insert
to authenticated
with check (auth.uid() = sender_id);

create policy "messages_receiver_update_read"
on public.messages for update
to authenticated
using (auth.uid() = receiver_id or auth.uid() = recipient_id)
with check (auth.uid() = receiver_id or auth.uid() = recipient_id);

drop policy if exists "site_stats_admin_only" on public.site_stats;

-- No anon/authenticated policy for site_stats. Service role API can read/write it,
-- but browser clients cannot enumerate stats directly.
