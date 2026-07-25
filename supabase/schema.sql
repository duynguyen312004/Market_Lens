-- MarketLens MVP schema
-- Run in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.analyses (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    file_name text not null,
    upload_mode text not null default 'single'
        check (upload_mode in ('single', 'combined')),
    source_file_count integer not null default 1
        check (source_file_count between 1 and 10),
    status text not null default 'completed'
        check (status in ('processing', 'completed', 'failed')),
    row_count integer not null default 0 check (row_count >= 0),
    date_from date,
    date_to date,
    result_json jsonb not null default '{}'::jsonb,
    error_message text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint analyses_date_range_check
        check (date_from is null or date_to is null or date_from <= date_to)
);

alter table public.analyses
    add column if not exists upload_mode text not null default 'single';
alter table public.analyses
    add column if not exists source_file_count integer not null default 1;

alter table public.analyses
    drop constraint if exists analyses_upload_mode_check;
alter table public.analyses
    add constraint analyses_upload_mode_check
        check (upload_mode in ('single', 'combined'));

alter table public.analyses
    drop constraint if exists analyses_source_file_count_check;
alter table public.analyses
    add constraint analyses_source_file_count_check
        check (source_file_count between 1 and 10);

create index if not exists analyses_user_created_idx
    on public.analyses (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists analyses_set_updated_at on public.analyses;
create trigger analyses_set_updated_at
before update on public.analyses
for each row execute function public.set_updated_at();

alter table public.analyses enable row level security;

-- Policies protect direct access with publishable key.
-- The FastAPI backend uses a server-side secret key and must still enforce
-- verified user ownership explicitly because secret keys bypass RLS.

drop policy if exists "Users can read own analyses" on public.analyses;
create policy "Users can read own analyses"
on public.analyses
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own analyses" on public.analyses;
create policy "Users can insert own analyses"
on public.analyses
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own analyses" on public.analyses;
create policy "Users can update own analyses"
on public.analyses
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own analyses" on public.analyses;
create policy "Users can delete own analyses"
on public.analyses
for delete
to authenticated
using ((select auth.uid()) = user_id);
