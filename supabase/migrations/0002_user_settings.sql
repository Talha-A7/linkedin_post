-- Per-user settings: the standing call to action ("My CTA") added to the end of posts.

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  cta_offer text not null default '',          -- e.g. "my free 30-page guide to starting a one-person business"
  cta_url text not null default '',            -- https://… (optional)
  cta_link_in_body boolean not null default false, -- false = link goes in the first comment
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.user_settings to authenticated;
alter table public.user_settings enable row level security;

create policy "settings: owner select" on public.user_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "settings: owner insert" on public.user_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "settings: owner update" on public.user_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Hardening (applied 2026-11-12): no access for signed-out visitors, and drop default
-- privileges the app never uses (TRUNCATE bypasses row-level security).
revoke all on public.user_settings from anon;
revoke truncate, references, trigger on public.audits, public.posts, public.user_settings from authenticated;
revoke delete on public.user_settings from authenticated;
