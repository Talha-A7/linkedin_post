-- Profile Pilot schema: saved audits and posts, private to each user.

create table public.audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  profile_type text not null check (profile_type in ('personal', 'company')),
  goal text not null,
  ideal_customer text not null,
  offer text not null default '',
  overall_score int,
  subject_name text,
  report jsonb not null,
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  audit_id uuid references public.audits (id) on delete set null,
  scenario text not null,
  goal text not null,
  tone text not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index audits_user_created_idx on public.audits (user_id, created_at desc);
create index posts_user_created_idx on public.posts (user_id, created_at desc);
create index posts_audit_id_idx on public.posts (audit_id);

-- Signed-in users reach these tables through the Data API; RLS below limits them to their own rows.
grant select, insert, delete on public.audits, public.posts to authenticated;

alter table public.audits enable row level security;
alter table public.posts enable row level security;

-- Each user can only see, create and delete their own rows.
create policy "audits: owner select" on public.audits for select to authenticated using ((select auth.uid()) = user_id);
create policy "audits: owner insert" on public.audits for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "audits: owner delete" on public.audits for delete to authenticated using ((select auth.uid()) = user_id);

create policy "posts: owner select" on public.posts for select to authenticated using ((select auth.uid()) = user_id);
create policy "posts: owner insert" on public.posts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "posts: owner delete" on public.posts for delete to authenticated using ((select auth.uid()) = user_id);
