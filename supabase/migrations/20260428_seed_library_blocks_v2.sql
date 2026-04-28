-- ============================================================================
-- 20260428_seed_library_blocks_v2.sql
--
-- Seeds the Library page (pages.library) in store_content_v2:
--   1. tapas_hero                  — page hero
--   2. tapas_library_stats         — stats strip (live page.stats_jsonb)
--   3. tapas_library_shelves       — full filterable shelves browser
--   4. tapas_library_house_rules   — numbered rules
--
-- pages.library.use_blocks=false; flip via SQL or Page Settings.
-- ============================================================================

do $$
declare
  v_library jsonb := jsonb_build_object(
    'name', 'Library',
    'slug', '/library',
    'use_blocks', false,
    'blocks', jsonb_build_array(
      jsonb_build_object('id', 'library_hero', 'type', 'tapas_hero', 'props', jsonb_build_object(
        'headline_line1', 'Two thousand books,',
        'headline_line2', 'on the honor system.',
        'description',    'A small lending library you can borrow from on the way out. Sign the ledger by the door, take it home, bring it back.',
        'cta_text',       'Browse the shelves',
        'cta_href',       '#shelves',
        'image_url',      'HERO-LIBRARY.png'
      )),
      jsonb_build_object('id', 'library_stats',     'type', 'tapas_library_stats',       'props', jsonb_build_object()),
      jsonb_build_object('id', 'library_shelves',   'type', 'tapas_library_shelves',     'props', jsonb_build_object('show_filter', true, 'show_featured', true)),
      jsonb_build_object('id', 'library_rules',     'type', 'tapas_library_house_rules', 'props', jsonb_build_object(
        'eyebrow', 'House Rules',
        'heading', 'How the lending works.',
        'body',    'No library card, no paperwork. Just a signature in the ledger by the door and a promise to bring them back.'
      ))
    )
  );
  v_existing jsonb;
  v_next     jsonb;
begin
  select value into v_existing from public.app_settings where key = 'store_content_v2' limit 1;
  if v_existing is null then
    v_next := jsonb_build_object('pages', jsonb_build_object('library', v_library));
    insert into public.app_settings (key, value, updated_at) values ('store_content_v2', v_next, now());
  else
    v_next := jsonb_set(coalesce(v_existing, '{}'::jsonb), '{pages,library}', v_library, true);
    update public.app_settings set value = v_next, updated_at = now() where key = 'store_content_v2';
  end if;
end $$;
