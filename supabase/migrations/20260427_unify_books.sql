-- ============================================================================
-- 20260427_unify_books.sql
--
-- Unifies the dashboard `books` inventory table with the storefront
-- `shop_books` and `library_books` tables so dashboard edits flow
-- straight to the customer site (mirrors the events unification done
-- in 20260426_unify_events.sql).
--
-- Mapping logic:
--   * The existing dashboard booleans `store_visible` and `is_borrowable`
--     drive which storefront page a book appears on:
--       store_visible=true            → /shop
--       is_borrowable=true            → /library (also requires shelf_id)
--       both true                     → both pages
--   * `shelf_id` is a nullable FK to `library_shelves`. Required only
--     when is_borrowable=true (enforced in the dashboard form, not the
--     DB — keeps existing inventory rows valid).
--   * Storefront-only display columns (slug, cover_url, cover_color,
--     sort_order, status) are added to `books` so the storefront
--     renderer has everything it needs.
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────
-- 1. Extend books with CMS display columns + shelf FK
-- ──────────────────────────────────────────────────────────────────
alter table public.books
  add column if not exists slug          text,
  add column if not exists cover_url     text,
  add column if not exists cover_color   text default 'taupe',
  add column if not exists sort_order    integer not null default 0,
  add column if not exists status        text    not null default 'published',
  add column if not exists shelf_id      uuid references public.library_shelves(id) on delete set null;

-- ──────────────────────────────────────────────────────────────────
-- 2. Backfill defaults on existing rows
-- ──────────────────────────────────────────────────────────────────
update public.books set slug = id::text where slug is null;
update public.books set cover_url = book_image where cover_url is null and book_image is not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'books_slug_unique') then
    alter table public.books add constraint books_slug_unique unique (slug);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'books_cover_color_check') then
    alter table public.books add constraint books_cover_color_check
      check (cover_color in ('taupe','cream','lime','orange','purple','pink','ink'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'books_status_check') then
    alter table public.books add constraint books_status_check
      check (status in ('draft','published'));
  end if;
end $$;

create index if not exists idx_books_status      on public.books (status);
create index if not exists idx_books_shelf       on public.books (shelf_id);
create index if not exists idx_books_storefront  on public.books (status, store_visible, is_borrowable);

-- ──────────────────────────────────────────────────────────────────
-- 3. Migrate shop_books seed → books (sale-only, no shelf)
-- ──────────────────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'shop_books'
  ) then
    insert into public.books (
      title, author, slug, cover_url, cover_color,
      price, sales_price, mrp,
      store_visible, is_borrowable, is_staff_pick,
      sort_order, status, created_at
    )
    select
      sb.title, sb.author, sb.slug, sb.cover_url, coalesce(sb.cover_color, 'taupe'),
      coalesce(sb.price_inr, 0), coalesce(sb.price_inr, 0), coalesce(sb.price_inr, 0),
      true, false, coalesce(sb.is_featured, false),
      coalesce(sb.sort_order, 0),
      case sb.status when 'published' then 'published' else 'draft' end,
      coalesce(sb.created_at, now())
    from public.shop_books sb
    on conflict (slug) do update set
      title         = excluded.title,
      author        = excluded.author,
      cover_url     = excluded.cover_url,
      cover_color   = excluded.cover_color,
      price         = excluded.price,
      sales_price   = excluded.sales_price,
      mrp           = excluded.mrp,
      store_visible = true,
      is_staff_pick = excluded.is_staff_pick,
      sort_order    = excluded.sort_order,
      status        = excluded.status;
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────────
-- 4. Migrate library_books seed → books (borrow-only, with shelf)
--    If a slug already exists from the shop_books migration, mark it
--    is_borrowable=true and assign the shelf — i.e. the same title
--    becomes available for both sale and borrow.
-- ──────────────────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'library_books'
  ) then
    insert into public.books (
      title, author, slug, cover_url, cover_color, shelf_id,
      store_visible, is_borrowable,
      quantity_total, quantity_available,
      sort_order, status, created_at
    )
    select
      lb.title, lb.author, lb.slug, lb.cover_url, coalesce(lb.cover_color, 'taupe'),
      lb.shelf_id,
      false, true,
      1,
      case lb.availability_status when 'out' then 0 else 1 end,
      coalesce(lb.sort_order, 0),
      case lb.status when 'published' then 'published' else 'draft' end,
      coalesce(lb.created_at, now())
    from public.library_books lb
    on conflict (slug) do update set
      is_borrowable = true,
      shelf_id      = excluded.shelf_id,
      cover_url     = coalesce(public.books.cover_url, excluded.cover_url),
      cover_color   = coalesce(public.books.cover_color, excluded.cover_color);
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────────
-- 5. Public RLS — storefront anon client reads published rows.
--    Storefront then filters in-app by store_visible / is_borrowable.
--    Existing dashboard staff policies untouched.
-- ──────────────────────────────────────────────────────────────────
alter table public.books enable row level security;

drop policy if exists "books_read_public_published" on public.books;
create policy "books_read_public_published"
  on public.books for select
  using (status = 'published');

-- library_shelves was already publicly readable when status='published'
-- (set up in 20260425_cms_typed_tables.sql) — leave that policy in place.

-- ──────────────────────────────────────────────────────────────────
-- 6. Drop shop_books and library_books
-- ──────────────────────────────────────────────────────────────────
drop trigger if exists trg_shop_books_updated on public.shop_books;
drop trigger if exists trg_library_books_updated on public.library_books;
drop table if exists public.shop_books cascade;
drop table if exists public.library_books cascade;
