-- Editable event host / organiser.
--
-- Adds two optional columns to `events`:
--   host_name  — who is hosting this event (defaults to the cafe on the
--                storefront when null)
--   host_url   — optional link shown on the host's name (e.g. an author's
--                site, an org page, or a social profile)
--
-- Safe to run more than once.
alter table public.events
  add column if not exists host_name text,
  add column if not exists host_url  text;
