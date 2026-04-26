-- ============================================================================
-- 20260426_unify_events.sql
--
-- Unifies the dashboard `events` table with the storefront `tapas_events`
-- table so dashboard edits flow straight to the customer site (no sync
-- step, no double-write, single source of truth).
--
-- Approach:
--   1. Extend `events` with the CMS display fields (slug, italic_accent,
--      category, badge, cta_type, chip_color, cover_url, sort_order)
--      that the storefront renderer needs.
--   2. Backfill the new columns on any existing events rows with safe
--      defaults so nothing breaks.
--   3. Copy data from `tapas_events` into `events` (status='published'
--      maps to dashboard's 'upcoming').
--   4. Add a public-read RLS policy on `events` so the storefront
--      anon client can SELECT rows where status='upcoming'. Staff
--      writes continue under the existing dashboard RLS.
--   5. Drop `tapas_events`.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────
-- 1. Extend events with CMS display columns
-- ──────────────────────────────────────────────────────────────────
alter table public.events
  add column if not exists slug          text,
  add column if not exists italic_accent text,
  add column if not exists category      text default 'book-club',
  add column if not exists badge         text,
  add column if not exists cta_type      text default 'rsvp',
  add column if not exists chip_color    text default 'lavender',
  add column if not exists cover_url     text,
  add column if not exists sort_order    integer not null default 0;

-- ──────────────────────────────────────────────────────────────────
-- 2. Backfill slug for existing rows (use id::text as a stable default)
--    then add the UNIQUE constraint.
-- ──────────────────────────────────────────────────────────────────
update public.events set slug = id::text where slug is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'events_slug_unique'
  ) then
    alter table public.events
      add constraint events_slug_unique unique (slug);
  end if;
end $$;

-- enums for category / badge / cta_type / chip_color (soft check —
-- additions allowed without migration, but values must be sane)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_category_check') then
    alter table public.events add constraint events_category_check
      check (category in ('book-club','poetry-supper','silent-reading','guest-night','members-only'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'events_badge_check') then
    alter table public.events add constraint events_badge_check
      check (badge is null or badge in ('weekly','monthly','prix-fixe','drop-in','guest-night'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'events_cta_type_check') then
    alter table public.events add constraint events_cta_type_check
      check (cta_type in ('rsvp','reserve','dropin'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'events_chip_color_check') then
    alter table public.events add constraint events_chip_color_check
      check (chip_color in ('lavender','sage','pink','peach','soft-pink'));
  end if;
end $$;

create index if not exists idx_events_status     on public.events (status);
create index if not exists idx_events_start_date on public.events (start_date);

-- ──────────────────────────────────────────────────────────────────
-- 3. Migrate data from tapas_events → events
--    Only run if tapas_events still exists (idempotent).
-- ──────────────────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'tapas_events'
  ) then
    insert into public.events (
      title, description, start_date, start_time, capacity,
      status, image_url,
      slug, italic_accent, category, badge, cta_type, chip_color, cover_url, sort_order,
      created_at, updated_at
    )
    select
      te.title,
      te.description,
      te.event_date,
      te.start_time,
      te.capacity,
      case te.status when 'published' then 'upcoming' else 'draft' end,
      te.cover_url,
      te.slug,
      te.italic_accent,
      te.category,
      te.badge,
      te.cta_type,
      te.chip_color,
      te.cover_url,
      te.sort_order,
      te.created_at,
      te.updated_at
    from public.tapas_events te
    on conflict (slug) do update set
      title         = excluded.title,
      description   = excluded.description,
      start_date    = excluded.start_date,
      start_time    = excluded.start_time,
      capacity      = excluded.capacity,
      status        = excluded.status,
      image_url     = excluded.image_url,
      italic_accent = excluded.italic_accent,
      category      = excluded.category,
      badge         = excluded.badge,
      cta_type      = excluded.cta_type,
      chip_color    = excluded.chip_color,
      cover_url     = excluded.cover_url,
      sort_order    = excluded.sort_order,
      updated_at    = excluded.updated_at;
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────────
-- 4. Public RLS — storefront anon client reads status='upcoming' only.
--    The existing dashboard policies (staff full access via auth) stay
--    in place; we're only adding a public read policy.
-- ──────────────────────────────────────────────────────────────────
alter table public.events enable row level security;

drop policy if exists "events_read_public_upcoming" on public.events;
create policy "events_read_public_upcoming"
  on public.events for select
  using (status = 'upcoming');

-- ──────────────────────────────────────────────────────────────────
-- 5. Drop tapas_events (and its references in trigger setups)
-- ──────────────────────────────────────────────────────────────────
drop trigger if exists trg_tapas_events_updated on public.tapas_events;
drop table if exists public.tapas_events cascade;
