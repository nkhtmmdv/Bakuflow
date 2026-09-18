-- Admin-only aggregate analytics. Each function re-checks is_admin() itself
-- (defense in depth: never rely solely on the caller having gone through an
-- admin-guarded page) and raises if the caller is not an admin.

create or replace function public.admin_reports_today()
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return (
    select count(*)::int from public.crowd_reports
    where created_at >= date_trunc('day', now())
  );
end;
$$;

create or replace function public.admin_active_users_today()
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return (
    select count(distinct user_id) from (
      select user_id from public.crowd_reports where created_at >= date_trunc('day', now())
      union
      select user_id from public.trip_requests
      where created_at >= date_trunc('day', now()) and user_id is not null
    ) as u
  );
end;
$$;

create or replace function public.admin_most_crowded_nodes(p_limit integer default 10)
returns table (
  node_id uuid,
  name_az text,
  name_ru text,
  crowd_score numeric,
  crowd_level text,
  report_count integer,
  confidence text,
  last_report_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select
      n.id,
      n.name_az,
      n.name_ru,
      agg.crowd_score,
      agg.crowd_level,
      agg.report_count,
      agg.confidence,
      agg.last_report_at
    from public.get_node_crowd_aggregates() agg
    join public.transport_nodes n on n.id = agg.node_id
    order by agg.crowd_score desc nulls last
    limit p_limit;
end;
$$;

create or replace function public.admin_top_origins(p_limit integer default 10)
returns table (node_id uuid, name_az text, name_ru text, searches bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select n.id, n.name_az, n.name_ru, count(*)::bigint as searches
    from public.trip_requests tr
    join public.transport_nodes n on n.id = tr.origin_node_id
    group by n.id, n.name_az, n.name_ru
    order by searches desc
    limit p_limit;
end;
$$;

create or replace function public.admin_top_destinations(p_limit integer default 10)
returns table (node_id uuid, name_az text, name_ru text, searches bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select n.id, n.name_az, n.name_ru, count(*)::bigint as searches
    from public.trip_requests tr
    join public.transport_nodes n on n.id = tr.destination_node_id
    group by n.id, n.name_az, n.name_ru
    order by searches desc
    limit p_limit;
end;
$$;

create or replace function public.admin_top_od_pairs(p_limit integer default 10)
returns table (
  origin_id uuid,
  origin_name_az text,
  origin_name_ru text,
  destination_id uuid,
  destination_name_az text,
  destination_name_ru text,
  searches bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select
      o.id, o.name_az, o.name_ru,
      d.id, d.name_az, d.name_ru,
      count(*)::bigint as searches
    from public.trip_requests tr
    join public.transport_nodes o on o.id = tr.origin_node_id
    join public.transport_nodes d on d.id = tr.destination_node_id
    group by o.id, o.name_az, o.name_ru, d.id, d.name_az, d.name_ru
    order by searches desc
    limit p_limit;
end;
$$;

-- Search volume bucketed into 30-minute windows, most recent 7 days.
create or replace function public.admin_peak_search_windows(p_limit integer default 10)
returns table (window_start timestamptz, searches bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select
      to_timestamp(floor(extract(epoch from created_at) / 1800) * 1800) as window_start,
      count(*)::bigint as searches
    from public.trip_requests
    where created_at >= now() - interval '7 days'
    group by window_start
    order by searches desc
    limit p_limit;
end;
$$;

grant execute on function public.admin_reports_today() to authenticated;
grant execute on function public.admin_active_users_today() to authenticated;
grant execute on function public.admin_most_crowded_nodes(integer) to authenticated;
grant execute on function public.admin_top_origins(integer) to authenticated;
grant execute on function public.admin_top_destinations(integer) to authenticated;
grant execute on function public.admin_top_od_pairs(integer) to authenticated;
grant execute on function public.admin_peak_search_windows(integer) to authenticated;
