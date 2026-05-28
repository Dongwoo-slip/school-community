-- Individual student verification codes.
-- Import Excel rows into public.student_verification_codes with:
-- code, student_no, student_name, grade, class_no

create extension if not exists pgcrypto;

create table if not exists public.student_verification_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  student_no text,
  student_name text not null,
  grade integer not null check (grade between 1 and 3),
  class_no integer not null check (class_no between 1 and 11),
  active boolean not null default true,
  used_by uuid unique references auth.users(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_verification_codes enable row level security;

create index if not exists student_verification_codes_code_idx
  on public.student_verification_codes (code);

create index if not exists student_verification_codes_used_by_idx
  on public.student_verification_codes (used_by);

alter table public.profiles
  add column if not exists student_verified boolean not null default false,
  add column if not exists student_no text,
  add column if not exists student_name text,
  add column if not exists student_verified_at timestamptz,
  add column if not exists verification_code_id uuid references public.student_verification_codes(id) on delete set null;

update public.profiles p
set
  student_no = v.student_no,
  student_name = coalesce(p.student_name, v.student_name),
  grade = coalesce(p.grade, v.grade),
  class_no = coalesce(p.class_no, v.class_no)
from public.student_verification_codes v
where v.used_by = p.id
  and v.student_no is not null;
