create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 60),
  origin_node_id uuid not null references public.transport_nodes (id) on delete cascade,
  destination_node_id uuid not null references public.transport_nodes (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, origin_node_id, destination_node_id)
);

create index favorites_user_id_idx on public.favorites (user_id);

alter table public.favorites enable row level security;

create policy "favorites_select_own"
  on public.favorites for select
  using (user_id = auth.uid());

create policy "favorites_insert_own"
  on public.favorites for insert
  with check (user_id = auth.uid());

create policy "favorites_update_own"
  on public.favorites for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "favorites_delete_own"
  on public.favorites for delete
  using (user_id = auth.uid());
