-- =====================================================================
-- Print queue — one-tap receipt printing from any phone or laptop.
--
-- A web page cannot talk to a Wi-Fi or USB receipt printer itself: browsers
-- block raw network sockets, Web Bluetooth doesn't exist on iPhone, and an
-- HTTPS dashboard can't call a printer's local address. So printing goes
-- through a queue:
--
--   any device → inserts a print_jobs row
--   the print station (printer_bridge on the shop Mac) → claims it, sends
--   ESC/POS bytes straight to the printer over Wi-Fi, marks it done/failed
--   the station also heartbeats → the POS shows printer online / offline
--
-- Security: receipts carry customer names, so only signed-in staff can read or
-- create jobs. The station does NOT hold the service-role key — it holds a
-- station key that only unlocks the three print_bridge_* functions below.
--
-- Safety contract: idempotent, purely additive.
-- =====================================================================

create table if not exists public.print_jobs (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid(),
  kind        text not null default 'receipt',
  payload     jsonb not null,
  status      text not null default 'queued'
              check (status in ('queued', 'printing', 'done', 'failed')),
  error       text,
  claimed_by  text,
  printed_at  timestamptz,
  updated_at  timestamptz not null default now()
);
create index if not exists print_jobs_status_created_idx on public.print_jobs (status, created_at);

create table if not exists public.print_stations (
  id               text primary key,          -- the station computer's name
  last_seen        timestamptz not null default now(),
  printer_online   boolean not null default false,
  printer_address  text,
  detail           text,
  updated_at       timestamptz not null default now()
);

-- One station key. Generated without extensions: two random UUIDs, dashes off.
create table if not exists public.print_station_keys (
  id          smallint primary key default 1 check (id = 1),
  token       text not null default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  created_at  timestamptz not null default now()
);
insert into public.print_station_keys (id) values (1) on conflict (id) do nothing;

alter table public.print_jobs         enable row level security;
alter table public.print_stations     enable row level security;
alter table public.print_station_keys enable row level security;

drop policy if exists "print_jobs_staff_insert" on public.print_jobs;
create policy "print_jobs_staff_insert" on public.print_jobs
  for insert to authenticated with check (true);
drop policy if exists "print_jobs_staff_read" on public.print_jobs;
create policy "print_jobs_staff_read" on public.print_jobs
  for select to authenticated using (true);

drop policy if exists "print_stations_staff_read" on public.print_stations;
create policy "print_stations_staff_read" on public.print_stations
  for select to authenticated using (true);

drop policy if exists "print_station_keys_staff_read" on public.print_station_keys;
create policy "print_station_keys_staff_read" on public.print_station_keys
  for select to authenticated using (true);

-- ── Station functions ────────────────────────────────────────────────────
-- SECURITY DEFINER so the station can work the queue with only the public
-- anon key plus its station key. Each call checks the key first.

create or replace function public.print_bridge_claim(p_token text, p_station text)
returns setof public.print_jobs
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.print_station_keys where token = p_token) then
    raise exception 'Invalid print station key';
  end if;

  -- A job stuck "printing" for 2 minutes means the station stopped mid-job.
  -- Fail it rather than re-queue: re-sending risks a duplicate receipt.
  update public.print_jobs
     set status = 'failed', error = 'Interrupted — the print station stopped mid-job', updated_at = now()
   where status = 'printing' and updated_at < now() - interval '2 minutes';

  -- A receipt still waiting after 30 minutes is no use to a customer who has
  -- left; don't let a printer that was off all afternoon spew a backlog.
  update public.print_jobs
     set status = 'failed', error = 'Expired — the printer was offline for 30 minutes', updated_at = now()
   where status = 'queued' and created_at < now() - interval '30 minutes';

  return query
  update public.print_jobs j
     set status = 'printing', claimed_by = p_station, updated_at = now()
   where j.id in (
     select id from public.print_jobs
      where status = 'queued'
      order by created_at
      limit 5
      for update skip locked
   )
  returning j.*;
end $$;

create or replace function public.print_bridge_finish(p_token text, p_id uuid, p_ok boolean, p_error text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.print_station_keys where token = p_token) then
    raise exception 'Invalid print station key';
  end if;
  update public.print_jobs
     set status     = case when p_ok then 'done' else 'failed' end,
         error      = case when p_ok then null else left(coalesce(p_error, 'Printer error'), 500) end,
         printed_at = case when p_ok then now() else null end,
         updated_at = now()
   where id = p_id;
end $$;

create or replace function public.print_bridge_heartbeat(
  p_token text, p_station text, p_online boolean, p_address text, p_detail text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.print_station_keys where token = p_token) then
    raise exception 'Invalid print station key';
  end if;
  insert into public.print_stations (id, last_seen, printer_online, printer_address, detail, updated_at)
  values (p_station, now(), p_online, p_address, p_detail, now())
  on conflict (id) do update
     set last_seen = now(), printer_online = excluded.printer_online,
         printer_address = excluded.printer_address, detail = excluded.detail, updated_at = now();

  -- Housekeeping: finished jobs are only useful for a couple of weeks.
  delete from public.print_jobs
   where status in ('done', 'failed') and created_at < now() - interval '14 days';
end $$;

revoke all on function public.print_bridge_claim(text, text) from public;
revoke all on function public.print_bridge_finish(text, uuid, boolean, text) from public;
revoke all on function public.print_bridge_heartbeat(text, text, boolean, text, text) from public;
grant execute on function public.print_bridge_claim(text, text) to anon, authenticated;
grant execute on function public.print_bridge_finish(text, uuid, boolean, text) to anon, authenticated;
grant execute on function public.print_bridge_heartbeat(text, text, boolean, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
