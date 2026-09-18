-- Anonymised demand signal: which OD pairs / times people search for.
-- No select policy for regular clients — individual trip history must never
-- be readable by other users. Admins only see it through the aggregate
-- functions in 0008_admin_analytics.sql.
create table public.trip_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  anonymous_session_id text,
  origin_node_id uuid not null references public.transport_nodes (id) on delete cascade,
  destination_node_id uuid not null references public.transport_nodes (id) on delete cascade,
  desired_arrival timestamptz,
  created_at timestamptz not null default now(),
  constraint trip_requests_identity_check check (
    (user_id is not null) or (anonymous_session_id is not null)
  )
);

create index trip_requests_origin_destination_created_idx
  on public.trip_requests (origin_node_id, destination_node_id, created_at desc);
create index trip_requests_created_at_idx on public.trip_requests (created_at desc);

alter table public.trip_requests enable row level security;

create policy "trip_requests_insert_self_or_anonymous"
  on public.trip_requests for insert
  with check (
    (auth.uid() is not null and user_id = auth.uid())
    or (auth.uid() is null and user_id is null and anonymous_session_id is not null)
  );

-- No select/update/delete policy: see comment above.
