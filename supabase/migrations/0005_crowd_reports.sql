-- Crowd reports are privacy-sensitive: we deliberately do NOT expose a
-- SELECT policy on this table to regular clients (not even the reporting
-- user). All reads happen through SECURITY DEFINER aggregate functions below,
-- which only ever return anonymous, aggregated numbers.
create table public.crowd_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  node_id uuid not null references public.transport_nodes (id) on delete cascade,
  route_id uuid references public.routes (id) on delete set null,
  level smallint not null check (level >= 0 and level <= 2),
  verified_near_node boolean not null default false,
  distance_to_node_m numeric(8, 1),
  created_at timestamptz not null default now()
);

create index crowd_reports_node_created_idx on public.crowd_reports (node_id, created_at desc);
create index crowd_reports_route_created_idx on public.crowd_reports (route_id, created_at desc);
create index crowd_reports_user_node_created_idx on public.crowd_reports (user_id, node_id, created_at desc);

-- Defense in depth: even if application-level rate limiting is bypassed,
-- the database itself refuses more than one report per user/node per 5 minutes.
create or replace function public.enforce_crowd_report_rate_limit()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.crowd_reports
    where user_id = new.user_id
      and node_id = new.node_id
      and created_at > now() - interval '5 minutes'
  ) then
    raise exception 'rate_limited: only one report per node every 5 minutes'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger crowd_reports_rate_limit
  before insert on public.crowd_reports
  for each row
  execute function public.enforce_crowd_report_rate_limit();

alter table public.crowd_reports enable row level security;

-- Users may only insert a report for themselves, and only while authenticated.
create policy "crowd_reports_insert_own"
  on public.crowd_reports for insert
  with check (auth.uid() = user_id);

-- No select/update/delete policies: raw reports are never directly readable,
-- not even by their author or by admins. See get_node_crowd_aggregates().

-- Returns the live crowd aggregate (score/level/confidence) for the given
-- node ids (or all active nodes when node_ids is null), using only reports
-- from the last 15 minutes. Never exposes user_id or any per-report row.
create or replace function public.get_node_crowd_aggregates(node_ids uuid[] default null)
returns table (
  node_id uuid,
  crowd_score numeric,
  crowd_level text,
  report_count integer,
  confidence text,
  last_report_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with recent as (
    select
      cr.node_id,
      cr.level,
      cr.created_at,
      cr.verified_near_node,
      coalesce(p.trust_score, 1.0) as trust_score
    from public.crowd_reports cr
    left join public.profiles p on p.id = cr.user_id
    where cr.created_at > now() - interval '15 minutes'
      and (node_ids is null or cr.node_id = any (node_ids))
  ),
  weighted as (
    select
      node_id,
      level,
      created_at,
      (
        case
          when now() - created_at <= interval '3 minutes' then 1.0
          when now() - created_at <= interval '6 minutes' then 0.8
          when now() - created_at <= interval '10 minutes' then 0.6
          else 0.3
        end
        * trust_score
        * (case when verified_near_node then 1.0 else 0.5 end)
      ) as effective_weight
    from recent
  ),
  aggregated as (
    select
      node_id,
      sum(level * effective_weight) / nullif(sum(effective_weight), 0) as crowd_score,
      count(*)::int as report_count,
      max(created_at) as last_report_at
    from weighted
    group by node_id
  )
  select
    a.node_id,
    a.crowd_score,
    case
      when a.crowd_score is null then 'unknown'
      when a.crowd_score < 0.66 then 'green'
      when a.crowd_score < 1.36 then 'yellow'
      else 'red'
    end as crowd_level,
    coalesce(a.report_count, 0) as report_count,
    case
      when coalesce(a.report_count, 0) = 0 then 'unknown'
      when a.report_count <= 2 then 'low'
      when a.report_count <= 7 then 'medium'
      else 'high'
    end as confidence,
    a.last_report_at
  from aggregated a;
$$;

grant execute on function public.get_node_crowd_aggregates(uuid[]) to anon, authenticated;

-- Minimal, non-identifying recent-reports feed for a single node, used by the
-- Next.js server to run the (unit-tested) TypeScript scoring algorithm
-- instead of duplicating it in SQL. Still never exposes user_id.
create or replace function public.get_node_recent_reports(p_node_id uuid)
returns table (
  level smallint,
  created_at timestamptz,
  verified_near_node boolean,
  trust_score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cr.level,
    cr.created_at,
    cr.verified_near_node,
    coalesce(p.trust_score, 1.0) as trust_score
  from public.crowd_reports cr
  left join public.profiles p on p.id = cr.user_id
  where cr.node_id = p_node_id
    and cr.created_at > now() - interval '15 minutes'
  order by cr.created_at desc;
$$;

grant execute on function public.get_node_recent_reports(uuid) to anon, authenticated;

-- Lets the currently authenticated user check their own last report time for
-- a node, so the API can show a friendly "wait N minutes" message instead of
-- only relying on the raw trigger exception. Never exposes other users' data.
create or replace function public.get_my_last_crowd_report_at(p_node_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select max(created_at)
  from public.crowd_reports
  where user_id = auth.uid() and node_id = p_node_id;
$$;

grant execute on function public.get_my_last_crowd_report_at(uuid) to authenticated;
