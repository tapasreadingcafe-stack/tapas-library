-- =====================================================================
-- Per-event contact number.
--
-- The event page and its "Contact the Host" link both used one hard-coded
-- cafe number, so an event run by an outside host had no way to show their
-- own. This lets each event carry its own, falling back to the cafe number
-- when it's blank — which is every existing event, so nothing changes for
-- them.
--
-- Safety contract: idempotent, purely additive, no existing column altered.
-- =====================================================================

alter table public.events
  add column if not exists contact_phone text,
  add column if not exists contact_label text;

comment on column public.events.contact_phone is
  'Number shown on the event page and used for its WhatsApp link. Blank = the cafe''s own number.';
comment on column public.events.contact_label is
  'Optional name beside the number, e.g. "Meenu". Blank shows "Call or WhatsApp us".';
