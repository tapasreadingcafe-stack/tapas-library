-- Multiple event hosts / organisers.
--
-- `hosts` is an ordered JSON array of { name, url } objects. The storefront
-- shows them joined by "×" — e.g. "Tapas Reading Cafe × Mallika × Jonny" —
-- with each name linked when a url is present. An empty list falls back to
-- "Tapas Reading Cafe".
--
-- Supersedes the single host_name / host_url columns (kept for back-compat;
-- the event page uses them as a fallback when `hosts` is empty).
alter table public.events
  add column if not exists hosts jsonb not null default '[]'::jsonb;
