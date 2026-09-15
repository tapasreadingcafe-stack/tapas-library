-- =====================================================================
-- Events hosted somewhere else — Luma, Insider, a partner's own page.
--
-- Some events aren't booked through us at all: the host runs the whole
-- thing on Luma and we're just one of the places people hear about it.
-- Until now the only way to list one was to create a normal event and
-- then watch people fill in OUR register form for a booking that doesn't
-- exist on the host's side.
--
-- With `external_url` set, the event still appears everywhere it should
-- — the events page, the calendar, the /link page — but tapping it opens
-- the host's page instead of ours. Nothing else about the row changes,
-- so date, cover image and price are still ours to show.
--
-- Safety contract:
--   * Idempotent and purely additive — no existing column is altered.
--   * An event with external_url null behaves exactly as it does today.
-- =====================================================================

alter table public.events
  add column if not exists external_url text;

comment on column public.events.external_url is
  'Where this event is actually hosted and booked (e.g. https://lu.ma/xyz). '
  'When set, every link to this event on the storefront opens this URL in a '
  'new tab instead of /events/:slug, and our own register form is replaced '
  'by a link out. Null for events we run and book ourselves.';
