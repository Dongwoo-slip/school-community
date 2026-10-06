-- Speed up message inbox, unread count, and mark-read queries.
-- Safe to run repeatedly.

create index if not exists messages_receiver_created_idx
on public.messages (receiver_id, created_at desc)
where receiver_id is not null;

create index if not exists messages_receiver_unread_idx
on public.messages (receiver_id, read)
where receiver_id is not null;

create index if not exists messages_recipient_created_idx
on public.messages (recipient_id, created_at desc)
where recipient_id is not null;

create index if not exists messages_recipient_unread_idx
on public.messages (recipient_id, read)
where recipient_id is not null;
