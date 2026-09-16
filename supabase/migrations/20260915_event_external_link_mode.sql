-- =====================================================================
-- Linked events: straight to the host, or via our own page?
--
-- `external_url` (20260915_event_external_link.sql) made listings open the
-- host's page directly. That is right when the host's page says everything
-- worth saying — but not always. Sometimes we want our own page first: our
-- cover, our description, our hosts, our phone number, and a button out to
-- the host only at the point of booking.
--
-- Which of the two an event uses is a per-event decision, so it is stored
-- per event rather than picked globally.
--
--   'direct' (default) — listings open external_url in a new tab.
--   'page'             — listings open /events/:slug as usual, and that
--                        page's Registration block is a link out instead
--                        of our register form.
--
-- Safety contract:
--   * Idempotent and purely additive. The default reproduces exactly what
--     every existing linked event does today, so nothing changes on its own.
--   * Meaningless without external_url, and ignored when that is null.
-- =====================================================================

alter table public.events
  add column if not exists external_link_mode text not null default 'direct';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_external_link_mode_check') then
    alter table public.events add constraint events_external_link_mode_check
      check (external_link_mode in ('direct', 'page'));
  end if;
end $$;

comment on column public.events.external_link_mode is
  'For an event with external_url: ''direct'' opens the host''s page straight '
  'from our listings; ''page'' opens our own /events/:slug first, where the '
  'register form is replaced by a link out. Ignored when external_url is null.';
