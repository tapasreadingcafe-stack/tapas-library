-- =====================================================================
-- editor-assets bucket — Phase C asset library.
--
-- Creates a public-read / staff-write Supabase Storage bucket for the
-- v2 website editor's uploaded images, videos, and SVGs.
--
-- Path convention (enforced client-side, not by SQL): the first path
-- segment is the originating pageId so staff can audit which page
-- spawned an upload even after moves. Files themselves are randomised
-- UUIDs so collisions are structurally impossible.
--
-- Safety contract:
--   * Idempotent — INSERT uses ON CONFLICT so re-running is a no-op.
--   * Public read so the storefront can serve the asset without an
--     auth hop; writes require a signed-in session so the storefront
--     can't be used to upload.
--   * Thumbnails live in the same bucket under .../thumbs/<name>;
--     the client writes both full and thumbnail blobs in one upload.
-- =====================================================================

-- 1. Bucket ----------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'editor-assets',
  'editor-assets',
  true,
  25 * 1024 * 1024,                       -- 25 MB per file
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'image/svg+xml', 'image/avif',
    'video/mp4', 'video/webm'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. RLS policies ----------------------------------------------------
-- Read: anyone. (The bucket is flagged public above, but an explicit
-- SELECT policy keeps PostgREST-style access explicit.)
drop policy if exists "editor_assets_read_anyone" on storage.objects;
create policy "editor_assets_read_anyone"
  on storage.objects for select
  using (bucket_id = 'editor-assets');

-- Insert: any authenticated user (staff) can upload.
drop policy if exists "editor_assets_insert_authed" on storage.objects;
create policy "editor_assets_insert_authed"
  on storage.objects for insert
  with check (
    bucket_id = 'editor-assets'
    and auth.role() = 'authenticated'
  );

-- Update / delete: only the uploader or anyone with the service role.
-- Owner is set automatically by storage on insert.
drop policy if exists "editor_assets_update_owner" on storage.objects;
create policy "editor_assets_update_owner"
  on storage.objects for update
  using (
    bucket_id = 'editor-assets'
    and (owner = auth.uid() or auth.role() = 'service_role')
  );

drop policy if exists "editor_assets_delete_owner" on storage.objects;
create policy "editor_assets_delete_owner"
  on storage.objects for delete
  using (
    bucket_id = 'editor-assets'
    and (owner = auth.uid() or auth.role() = 'service_role')
  );
