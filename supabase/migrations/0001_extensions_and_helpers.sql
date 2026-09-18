-- BakuFlow: extensions + shared helper functions/triggers
-- These are used across later migrations.

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- Generic "touch updated_at" trigger, reused by every table that has the column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
