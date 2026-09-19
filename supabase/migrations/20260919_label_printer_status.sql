-- =====================================================================
-- The barcode label printer reports for duty, like the receipt printer.
--
-- Labels already print through the print_jobs queue, so any phone can send
-- one. What was missing is the other half of that deal: the dashboard had no
-- way to say whether the Zebra is actually there. The Devices page asked
-- 127.0.0.1:5050 — "the machine running this browser" — so the card read
-- "Not connected" on every device except the one Mac, and nobody could tell a
-- Zebra that was switched off from one that was fine.
--
-- The station already heartbeats every 10s with the receipt printer's state.
-- It now carries the label printer's state in the same beat.
--
-- label_online is NULL, not false, when a station has never reported it — an
-- older station that hasn't been updated. "I don't know" and "it's broken"
-- read very differently to whoever is standing at the counter, so the
-- dashboard tells them apart and asks for that till to be set up again.
--
-- Safety contract: idempotent, purely additive.
-- =====================================================================

alter table public.print_stations add column if not exists label_online  boolean;
alter table public.print_stations add column if not exists label_address text;
alter table public.print_stations add column if not exists label_detail  text;

-- The heartbeat grows three arguments. They have defaults, so a till still
-- running the old station keeps beating (and leaves the label columns NULL)
-- until someone re-runs its setup command.
--
-- Dropped first rather than replaced: `create or replace` with a different
-- argument list leaves BOTH versions behind, and a 5-argument call from an
-- old station would then be ambiguous — Postgres refuses it and the till
-- stops reporting at all.
drop function if exists public.print_bridge_heartbeat(text, text, boolean, text, text);

create or replace function public.print_bridge_heartbeat(
  p_token text, p_station text, p_online boolean, p_address text, p_detail text,
  p_label_online boolean default null, p_label_address text default null, p_label_detail text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.print_station_keys where token = p_token) then
    raise exception 'Invalid print station key';
  end if;
  insert into public.print_stations (
    id, last_seen, printer_online, printer_address, detail,
    label_online, label_address, label_detail, updated_at
  )
  values (
    p_station, now(), p_online, p_address, p_detail,
    p_label_online, p_label_address, p_label_detail, now()
  )
  on conflict (id) do update
     set last_seen = now(), printer_online = excluded.printer_online,
         printer_address = excluded.printer_address, detail = excluded.detail,
         label_online = excluded.label_online, label_address = excluded.label_address,
         label_detail = excluded.label_detail, updated_at = now();

  -- Housekeeping: finished jobs are only useful for a couple of weeks.
  delete from public.print_jobs
   where status in ('done', 'failed') and created_at < now() - interval '14 days';
end $$;

revoke all on function public.print_bridge_heartbeat(text, text, boolean, text, text, boolean, text, text) from public;
grant execute on function public.print_bridge_heartbeat(text, text, boolean, text, text, boolean, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
