-- Speed up post lists, post detail, comments, and "my posts" queries.
-- Safe to run repeatedly.

create index if not exists posts_board_deleted_created_idx
on public.posts (board, is_deleted, created_at desc);

create index if not exists posts_board_deleted_author_created_idx
on public.posts (board, is_deleted, author_id, created_at desc);

create index if not exists posts_board_deleted_title_idx
on public.posts (board, is_deleted, title);

create index if not exists comments_post_created_idx
on public.comments (post_id, created_at asc);

create index if not exists profiles_role_idx
on public.profiles (role);
