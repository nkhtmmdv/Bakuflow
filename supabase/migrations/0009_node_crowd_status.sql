-- A small, publicly-readable "materialized" aggregate table that mirrors
-- get_node_crowd_aggregates() for exactly one node at a time. It exists so
-- /live can subscribe to Supabase Realtime directly: Realtime respects RLS,
-- and crowd_reports itself is intentionally not readable by anyone (see
-- 0005_crowd_reports.sql), so clients cannot subscribe to it. This table
-- carries no per-report or per-user data, only the same aggregate numbers
-- get_node_crowd_aggregates() already exposes publicly.
create table public.node_crowd_status (
  node_id uuid primary key references public.transport_nodes (id) on delete cascade,
  crowd_score numeric,
  crowd_level text not null default 'unknown',
  report_count integer not null default 0,
  confidence text not null default 'unknown',
  last_report_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.node_crowd_status enable row level security;

create policy "node_crowd_status_select_active_or_admin"
  on public.node_crowd_status for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.transport_nodes n
      where n.id = node_crowd_status.node_id and n.active = true
    )
  );

-- No insert/update/delete policy for any client role: only the SECURITY
-- DEFINER trigger function below (running as the table owner) may write here.
create or replace function public.refresh_node_crowd_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.node_crowd_status (node_id, crowd_score, crowd_level, report_count, confidence, last_report_at, updated_at)
  select node_id, crowd_score, crowd_level, report_count, confidence, last_report_at, now()
  from public.get_node_crowd_aggregates(array[new.node_id])
  on conflict (node_id) do update set
    crowd_score = excluded.crowd_score,
    crowd_level = excluded.crowd_level,
    report_count = excluded.report_count,
    confidence = excluded.confidence,
    last_report_at = excluded.last_report_at,
    updated_at = now();
  return new;
end;
$$;

create trigger crowd_reports_refresh_node_status
  after insert on public.crowd_reports
  for each row
  execute function public.refresh_node_crowd_status();

-- Make the table available to Supabase Realtime subscriptions.
alter publication supabase_realtime add table public.node_crowd_status;
