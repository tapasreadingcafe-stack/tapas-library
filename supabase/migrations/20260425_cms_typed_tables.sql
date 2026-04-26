-- =====================================================================
-- 20260425_cms_typed_tables.sql  —  CMS Phase 2 schema.
--
-- Adds typed content tables for every page that currently renders from
-- hardcoded data modules in tapas-store/src/data/. Each table has its
-- own RLS: public reads see only status='published', staff (via the
-- existing public.is_staff() helper) have full read+write.
--
-- Image references are full public URLs in the existing editor-assets
-- bucket. Tables that don't have media just don't carry a *_url column.
--
-- Singletons (featured_supper, contact_info, about_manifesto) use a
-- BOOLEAN-PRIMARY-KEY trick to enforce exactly one row.
--
-- Re-runnable: every CREATE uses IF NOT EXISTS, every policy is
-- preceded by DROP POLICY IF EXISTS, every trigger is replaced via the
-- DO block at the bottom.
-- =====================================================================

-- ──────────────────────────────────────────────────────────────────
-- shared updated_at trigger fn
-- ──────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ──────────────────────────────────────────────────────────────────
-- pages  —  per-page hero copy + SEO + page-level stats
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.pages (
  id                uuid        primary key default gen_random_uuid(),
  slug              text        not null unique
                                check (slug in ('home','shop','library','blog','events','contact','about','cart')),
  title             text        not null,
  hero_kicker       text,
  hero_heading_html text,                              -- <em> allowed
  hero_lede         text,
  hero_image_url    text,
  meta_title        text,
  meta_description  text,
  stats_jsonb       jsonb,                             -- arbitrary page-level numbers (library counts, etc.)
  status            text        not null default 'published'
                                check (status in ('draft','published')),
  updated_at        timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────
-- shop_books  —  inventory FOR SALE
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.shop_books (
  id           uuid        primary key default gen_random_uuid(),
  slug         text        not null unique,
  title        text        not null,
  author       text        not null,
  cover_url    text,
  cover_color  text        default 'taupe'
                           check (cover_color in ('purple','orange','ink','pink','lime','taupe','cream')),
  price_inr    integer     not null check (price_inr >= 0),
  categories   text[]      not null default '{}',
  clubs        text[]      not null default '{}',     -- separate from categories: which book clubs feature this title
  format       text        not null default 'Paperback'
                           check (format in ('Paperback','Hardcover','Used')),
  in_stock     boolean     not null default true,
  signed       boolean     not null default false,
  description  text,
  is_featured  boolean     not null default false,
  sort_order   integer     not null default 0,
  status       text        not null default 'published'
                           check (status in ('draft','published')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
-- At most one featured book at a time (partial unique on the truthy side).
create unique index if not exists idx_shop_books_one_featured
  on public.shop_books (is_featured) where is_featured = true;
create index if not exists idx_shop_books_sort   on public.shop_books (sort_order);
create index if not exists idx_shop_books_status on public.shop_books (status);

-- ──────────────────────────────────────────────────────────────────
-- library_shelves + library_books  —  inventory FOR BORROWING
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.library_shelves (
  id            uuid        primary key default gen_random_uuid(),
  slug          text        not null unique,
  name          text        not null,
  italic_accent text,
  title_count   integer     not null default 0,
  out_on_loan   integer     not null default 0,
  is_featured   boolean     not null default false,
  sort_order    integer     not null default 0,
  status        text        not null default 'published'
                            check (status in ('draft','published')),
  updated_at    timestamptz not null default now()
);
create unique index if not exists idx_library_shelves_one_featured
  on public.library_shelves (is_featured) where is_featured = true;
create index if not exists idx_library_shelves_sort on public.library_shelves (sort_order);

create table if not exists public.library_books (
  id                  uuid        primary key default gen_random_uuid(),
  shelf_id            uuid        not null references public.library_shelves(id) on delete cascade,
  slug                text        not null,
  title               text        not null,
  author              text        not null,
  cover_url           text,
  cover_color         text        default 'cream',
  availability_status text        not null default 'available'
                                  check (availability_status in ('available','out')),
  return_date         date,                                  -- only meaningful when availability_status='out'
  categories          text[]      not null default '{}',
  sort_order          integer     not null default 0,
  status              text        not null default 'published'
                                  check (status in ('draft','published')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (shelf_id, slug)
);
create index if not exists idx_library_books_shelf  on public.library_books (shelf_id, sort_order);
create index if not exists idx_library_books_status on public.library_books (status);

-- ──────────────────────────────────────────────────────────────────
-- events  —  calendar entries + upcoming events list
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.tapas_events (
  id            uuid        primary key default gen_random_uuid(),
  slug          text        not null unique,
  title         text        not null,
  italic_accent text,
  description   text,                                  -- nullable: minimal calendar-only stubs leave this null
  event_date    date        not null,
  start_time    time,
  capacity      integer,
  reserved      integer     not null default 0,
  category      text        not null default 'book-club'
                            check (category in ('book-club','poetry-supper','silent-reading','guest-night','members-only')),
  badge         text        check (badge in ('weekly','monthly','prix-fixe','drop-in','guest-night')),
  cta_type      text        not null default 'rsvp'
                            check (cta_type in ('rsvp','reserve','dropin')),
  chip_color    text        default 'lavender'
                            check (chip_color in ('lavender','sage','pink','peach','soft-pink')),
  cover_url     text,
  sort_order    integer     not null default 0,
  status        text        not null default 'published'
                            check (status in ('draft','published')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_tapas_events_date   on public.tapas_events (event_date);
create index if not exists idx_tapas_events_status on public.tapas_events (status);

-- ──────────────────────────────────────────────────────────────────
-- clubs  —  recurring weekly clubs
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.clubs (
  id            uuid        primary key default gen_random_uuid(),
  slug          text        not null unique,
  title_html    text        not null,                  -- <em> allowed
  schedule      text        not null,                  -- "THURSDAYS · 7:00P"
  description   text,
  total_seats   integer,
  status_label  text,                                   -- "Waitlist", "3 open", etc.
  sort_order    integer     not null default 0,
  status        text        not null default 'published'
                            check (status in ('draft','published')),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_clubs_sort on public.clubs (sort_order);

-- ──────────────────────────────────────────────────────────────────
-- featured_supper  —  SINGLETON
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.featured_supper (
  id                  boolean     primary key default true check (id),
  kicker              text,
  title               text,
  italic_accent       text,
  description         text,
  menu_title          text,
  courses             jsonb       not null default '[]'::jsonb,   -- [{number, dish, attribution}, ...]
  price_full          integer,
  price_member        integer,
  price_wine_pairing  integer,
  cover_url           text,
  status              text        not null default 'published'
                                  check (status in ('draft','published')),
  updated_at          timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────
-- contact_info  —  SINGLETON
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.contact_info (
  id              boolean     primary key default true check (id),
  address_line_1  text,
  address_line_2  text,
  phone           text,
  email_general   text,
  email_events    text,
  email_press     text,
  parking         text,
  transit         text,
  accessibility   text,
  map_label       text,
  updated_at      timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────
-- hours  —  exactly 7 rows, one per weekday
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.hours (
  day         text    primary key check (day in ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
  opens       time,
  closes      time,
  is_closed   boolean not null default false,
  sort_order  integer not null
);

-- ──────────────────────────────────────────────────────────────────
-- faqs
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.faqs (
  id                  uuid        primary key default gen_random_uuid(),
  question            text        not null,
  answer              text        not null,
  is_open_by_default  boolean     not null default false,
  sort_order          integer     not null default 0,
  status              text        not null default 'published'
                                  check (status in ('draft','published')),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_faqs_sort on public.faqs (sort_order);

-- ──────────────────────────────────────────────────────────────────
-- blog_posts
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.journal_posts (
  id              uuid        primary key default gen_random_uuid(),
  slug            text        not null unique,
  category        text        not null
                              check (category in ('Essay','Interview','Marginalia','Club Notes','Recipe','Translator Diary')),
  cover_color     text        default 'taupe',
  cover_url       text,
  title_html      text        not null,                -- <em> allowed
  excerpt         text,
  body_markdown   text,
  author_name     text,
  author_initial  text,
  read_minutes    integer,
  is_featured     boolean     not null default false,
  is_sidebar      boolean     not null default false,
  sidebar_kicker  text,                                 -- e.g. "STAFF PICK", "CONVERSATION"
  sort_order      integer     not null default 0,
  published_at    timestamptz,
  status          text        not null default 'published'
                              check (status in ('draft','published')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index if not exists idx_journal_posts_one_featured
  on public.journal_posts (is_featured) where is_featured = true;
create index if not exists idx_journal_posts_pub    on public.journal_posts (published_at desc);
create index if not exists idx_journal_posts_status on public.journal_posts (status);

-- ──────────────────────────────────────────────────────────────────
-- about_*  —  manifesto + stats + timeline + compromises + team + press
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.about_manifesto (
  id            boolean     primary key default true check (id),
  kicker        text,
  heading_html  text,
  paragraphs    jsonb       not null default '[]'::jsonb,    -- [{drop_cap, body}, ...]
  updated_at    timestamptz not null default now()
);

create table if not exists public.about_stats (
  id              uuid        primary key default gen_random_uuid(),
  label           text        not null,
  value           text        not null,
  is_highlighted  boolean     not null default false,
  sort_order      integer     not null default 0,
  updated_at      timestamptz not null default now()
);

create table if not exists public.about_timeline (
  id          uuid        primary key default gen_random_uuid(),
  year        text        not null,
  heading     text        not null,
  body        text,
  sort_order  integer     not null default 0,
  updated_at  timestamptz not null default now()
);

create table if not exists public.about_compromises (
  id            uuid        primary key default gen_random_uuid(),
  number_label  text,                                            -- "01", "02", "03"
  title_html    text        not null,
  body          text,
  bg_color      text        default 'lime' check (bg_color in ('lime','white','orange')),
  sort_order    integer     not null default 0,
  updated_at    timestamptz not null default now()
);

create table if not exists public.team_members (
  id                  uuid        primary key default gen_random_uuid(),
  initials            text        not null,
  color               text        default 'cream'
                                  check (color in ('cream','lime','orange','lavender')),
  name                text        not null,
  role                text,
  currently_reading   text,
  photo_url           text,
  sort_order          integer     not null default 0,
  status              text        not null default 'published'
                                  check (status in ('draft','published')),
  updated_at          timestamptz not null default now()
);

create table if not exists public.press_quotes (
  id          uuid        primary key default gen_random_uuid(),
  source      text        not null,
  quote       text        not null,
  context     text,                                              -- e.g. "DINING · 2024"
  sort_order  integer     not null default 0,
  updated_at  timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────
-- members extension  —  membership_tier + payment_status
--
-- The members table already exists from the ecommerce migration with
-- auth_user_id UNIQUE → auth.users(id) and a trigger that creates a
-- members row on every auth.users INSERT. We're just adding two
-- columns for Phase 2's tier/payment surface.
-- ──────────────────────────────────────────────────────────────────
alter table public.members
  add column if not exists membership_tier text
    check (membership_tier in ('pass','monthly','annual')),
  add column if not exists payment_status text default 'unpaid'
    check (payment_status in ('unpaid','paid','past_due','cancelled'));

-- Guard: existing members RLS lets a customer UPDATE their own row.
-- Without this, they could set plan='annual', payment_status='paid',
-- subscription_end into 2099, fine_balance=0, even change their own
-- email and bypass the verification flow.
--
-- Allow-list approach: customers may only change profile-style fields
-- (name, phone, dob/age, photo, shipping_address). Everything else
-- defaults to staff-only — so any new column added in future migrations
-- automatically inherits the protection until someone explicitly opts
-- it in here. updated_at is in the allow-list because the
-- touch-updated_at pattern bumps it on every UPDATE.
--
-- Staff (is_staff()) bypass entirely; the service-role context used by
-- future signup/payment edge functions also bypasses (postgres role
-- skips triggers when set with `SECURITY DEFINER` callers, but more
-- importantly is_staff() returns false → would block, so service-role
-- code should run as a SECURITY DEFINER function flagged appropriately
-- when wiring is implemented in a later phase).
create or replace function public.prevent_member_self_escalation() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  allow constant text[] := array[
    'name', 'phone', 'date_of_birth', 'age',
    'profile_photo', 'shipping_address', 'updated_at'
  ];
  old_strip jsonb;
  new_strip jsonb;
  k text;
begin
  if public.is_staff() then
    return new;
  end if;
  -- Build a copy of OLD/NEW with the allow-list keys removed,
  -- then compare. Any difference → a guarded column changed.
  old_strip := to_jsonb(old);
  new_strip := to_jsonb(new);
  foreach k in array allow loop
    old_strip := old_strip - k;
    new_strip := new_strip - k;
  end loop;
  if old_strip is distinct from new_strip then
    raise exception 'members: only staff may change fields outside %', allow;
  end if;
  return new;
end $$;

drop trigger if exists trg_members_prevent_self_escalation on public.members;
create trigger trg_members_prevent_self_escalation
  before update on public.members
  for each row execute function public.prevent_member_self_escalation();

-- last_login surface for the dashboard intentionally NOT added in
-- Phase 2. Reading auth.users from a view requires either too-broad
-- grants on auth.users for the `authenticated` role, or a
-- SECURITY DEFINER wrapper. Phase 4 will add a SECURITY DEFINER RPC
-- list_members_with_auth() gated by public.is_staff() when the
-- dashboard actually consumes last_login. Dashboard code can already
-- read everything else (id, email, name, status, tier, payment) from
-- public.members directly via the existing RLS.

-- ──────────────────────────────────────────────────────────────────
-- updated_at triggers  (reset for every Phase-2 table)
-- ──────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'pages','shop_books','library_shelves','library_books','tapas_events','clubs',
      'featured_supper','contact_info','faqs','journal_posts','about_manifesto',
      'about_stats','about_timeline','about_compromises','team_members','press_quotes'
    ])
  loop
    execute format('drop trigger if exists trg_%I_updated on public.%I', t, t);
    execute format(
      'create trigger trg_%I_updated before update on public.%I '
      'for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────────────
-- RLS  —  enable on every Phase-2 table
-- ──────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'pages','shop_books','library_shelves','library_books','tapas_events','clubs',
      'featured_supper','contact_info','hours','faqs','journal_posts','about_manifesto',
      'about_stats','about_timeline','about_compromises','team_members','press_quotes'
    ])
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- A. Tables WITH a status column: public reads only status='published';
--    staff (is_staff()) can read everything and do all writes.
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'pages','shop_books','library_shelves','library_books','tapas_events','clubs',
      'featured_supper','faqs','journal_posts','team_members'
    ])
  loop
    execute format('drop policy if exists "%s_read_published" on public.%I', t, t);
    execute format(
      'create policy "%s_read_published" on public.%I for select '
      'using (status = ''published'' or public.is_staff())', t, t);

    execute format('drop policy if exists "%s_write_staff" on public.%I', t, t);
    execute format(
      'create policy "%s_write_staff" on public.%I for all '
      'using (public.is_staff()) with check (public.is_staff())', t, t);
  end loop;
end $$;

-- B. Tables WITHOUT a status column: public reads everything; staff
--    has full write.
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'contact_info','hours','about_manifesto','about_stats','about_timeline',
      'about_compromises','press_quotes'
    ])
  loop
    execute format('drop policy if exists "%s_read_anyone" on public.%I', t, t);
    execute format(
      'create policy "%s_read_anyone" on public.%I for select using (true)', t, t);

    execute format('drop policy if exists "%s_write_staff" on public.%I', t, t);
    execute format(
      'create policy "%s_write_staff" on public.%I for all '
      'using (public.is_staff()) with check (public.is_staff())', t, t);
  end loop;
end $$;

-- C. members table already has RLS from the existing ecommerce
--    migration (staff full access; member sees own row). The new
--    columns (membership_tier, payment_status) inherit the same
--    policy — no additions needed.
