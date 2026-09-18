create table public.transport_nodes (
  id uuid primary key default gen_random_uuid(),
  name_az text not null,
  name_ru text not null,
  slug text not null unique,
  type text not null check (type in ('metro', 'bus_stop', 'transport_hub', 'other')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transport_nodes_type_idx on public.transport_nodes (type);
create index transport_nodes_active_idx on public.transport_nodes (active);

create trigger transport_nodes_set_updated_at
  before update on public.transport_nodes
  for each row
  execute function public.set_updated_at();

alter table public.transport_nodes enable row level security;

-- Public (including anonymous) can read active nodes; admins can also see
-- deactivated ones so they can re-activate them.
create policy "transport_nodes_select_active_or_admin"
  on public.transport_nodes for select
  using (active = true or public.is_admin());

create policy "transport_nodes_write_admin_only"
  on public.transport_nodes for insert
  with check (public.is_admin());

create policy "transport_nodes_update_admin_only"
  on public.transport_nodes for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "transport_nodes_delete_admin_only"
  on public.transport_nodes for delete
  using (public.is_admin());
