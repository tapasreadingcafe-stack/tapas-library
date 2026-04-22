-- =====================================================================
-- store_collections + store_collection_items — Phase I1 CMS foundation.
--
-- A `store_collection` describes a content type (e.g. "Book of the
-- month", "Team member"). Its `fields` column stores the schema as a
-- jsonb array:
--
--   [{ key, label, type, options? }, ...]
--
-- `type` is one of: text, rich_text, number, boolean, date, image,
-- link, color, reference, option.
--
-- Items live in store_collection_items with payload in `data` (jsonb
-- keyed by field.key). `slug` is per-collection and feeds future
-- dynamic-route pages. `status` ∈ {draft, published} so authors can
-- stage changes; `published_at` is set on publish for list ordering.
--
-- Safety contract:
--   * Idempotent — CREATE IF NOT EXISTS / DROP POLICY IF EXISTS.
--   * Public SELECT on published items so the storefront can list.
--   * Authenticated INSERT / UPDATE / DELETE for staff. Owner of the
--     row = whoever created it; service role can always write.
-- =====================================================================

create table if not exists store_collections (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  fields     jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists store_collection_items (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references store_collections(id) on delete cascade,
  slug          text not null,
  data          jsonb not null default '{}'::jsonb,
  status        text not null default 'draft' check (status in ('draft', 'published')),
  published_at  timestamptz,
  owner         uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (collection_id, slug)
);

create index if not exists idx_collection_items_collection
  on store_collection_items(collection_id, status, published_at desc);

-- Touch updated_at on every update.
create or replace function store_collections_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_store_collections_updated on store_collections;
create trigger trg_store_collections_updated
  before update on store_collections
  for each row execute function store_collections_touch();

drop trigger if exists trg_store_collection_items_updated on store_collection_items;
create trigger trg_store_collection_items_updated
  before update on store_collection_items
  for each row execute function store_collections_touch();

-- RLS
alter table store_collections        enable row level security;
alter table store_collection_items   enable row level security;

-- Collections: public read, authed write.
drop policy if exists "collections_read_anyone"   on store_collections;
create policy "collections_read_anyone"
  on store_collections for select using (true);

drop policy if exists "collections_insert_authed" on store_collections;
create policy "collections_insert_authed"
  on store_collections for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "collections_update_authed" on store_collections;
create policy "collections_update_authed"
  on store_collections for update
  using (auth.role() = 'authenticated');

drop policy if exists "collections_delete_authed" on store_collections;
create policy "collections_delete_authed"
  on store_collections for delete
  using (auth.role() = 'authenticated');

-- Items: public sees only published, authed can do everything.
drop policy if exists "items_read_published"  on store_collection_items;
create policy "items_read_published"
  on store_collection_items for select
  using (status = 'published' or auth.role() = 'authenticated');

drop policy if exists "items_insert_authed"   on store_collection_items;
create policy "items_insert_authed"
  on store_collection_items for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "items_update_authed"   on store_collection_items;
create policy "items_update_authed"
  on store_collection_items for update
  using (auth.role() = 'authenticated');

drop policy if exists "items_delete_authed"   on store_collection_items;
create policy "items_delete_authed"
  on store_collection_items for delete
  using (auth.role() = 'authenticated');
