create table public.routes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_az text not null,
  name_ru text not null,
  type text not null check (type in ('bus', 'express_bus', 'metro', 'walking', 'other')),
  active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index routes_active_idx on public.routes (active);
create index routes_type_idx on public.routes (type);

create trigger routes_set_updated_at
  before update on public.routes
  for each row
  execute function public.set_updated_at();

alter table public.routes enable row level security;

create policy "routes_select_active_or_admin"
  on public.routes for select
  using (active = true or public.is_admin());

create policy "routes_write_admin_only"
  on public.routes for insert
  with check (public.is_admin());

create policy "routes_update_admin_only"
  on public.routes for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "routes_delete_admin_only"
  on public.routes for delete
  using (public.is_admin());

-- Ordered stops that make up a route, e.g. M1: Node A -> Node B -> Node C.
create table public.route_nodes (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes (id) on delete cascade,
  node_id uuid not null references public.transport_nodes (id) on delete restrict,
  sequence integer not null check (sequence >= 0),
  estimated_minutes_from_previous integer not null default 0 check (estimated_minutes_from_previous >= 0),
  created_at timestamptz not null default now(),
  unique (route_id, sequence)
);

create index route_nodes_route_id_sequence_idx on public.route_nodes (route_id, sequence);
create index route_nodes_node_id_idx on public.route_nodes (node_id);

alter table public.route_nodes enable row level security;

create policy "route_nodes_select_via_active_route_or_admin"
  on public.route_nodes for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.routes r
      where r.id = route_nodes.route_id and r.active = true
    )
  );

create policy "route_nodes_write_admin_only"
  on public.route_nodes for insert
  with check (public.is_admin());

create policy "route_nodes_update_admin_only"
  on public.route_nodes for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "route_nodes_delete_admin_only"
  on public.route_nodes for delete
  using (public.is_admin());
