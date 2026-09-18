-- Profiles: one row per auth.users row.
-- role & trust_score are privileged columns: only the service role (server-side)
-- may change them (enforced by trigger below), never the client directly.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  language text not null default 'az' check (language in ('az', 'ru', 'en')),
  trust_score numeric(3, 2) not null default 1.0 check (trust_score >= 0.25 and trust_score <= 2.0),
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Prevents a regular authenticated user from escalating their own role or
-- trust_score via a normal `update profiles` call. Only requests made with the
-- service_role key (see lib/supabase/admin.ts) bypass this guard.
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
as $$
begin
  if auth.role() is distinct from 'service_role' then
    new.role := old.role;
    new.trust_score := old.trust_score;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_privileged_columns
  before update on public.profiles
  for each row
  execute function public.protect_profile_privileged_columns();

-- SECURITY DEFINER so it can be safely referenced from RLS policies on other
-- tables without those policies needing direct read access to `profiles`.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', null),
    coalesce(new.raw_user_meta_data ->> 'language', 'az')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- No delete policy: profiles are never deleted from the client.
