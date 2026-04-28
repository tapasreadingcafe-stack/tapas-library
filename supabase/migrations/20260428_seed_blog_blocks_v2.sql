-- ============================================================================
-- 20260428_seed_blog_blocks_v2.sql
--
-- Seeds the Blog page (pages.blog) in store_content_v2:
--   1. tapas_hero            — page hero
--   2. tapas_blog_featured   — large featured article (live useJournalPosts)
--   3. tapas_blog_sidebar    — sidebar 3-card stack    (live useJournalPosts)
--   4. tapas_blog_archive    — filterable archive grid (live useJournalPosts)
--   5. tapas_newsletter      — Dispatch signup
--
-- pages.blog.use_blocks=false; flip via SQL or Page Settings.
-- ============================================================================

do $$
declare
  v_blog jsonb := jsonb_build_object(
    'name', 'Journal',
    'slug', '/blog',
    'use_blocks', false,
    'blocks', jsonb_build_array(
      jsonb_build_object('id', 'blog_hero', 'type', 'tapas_hero', 'props', jsonb_build_object(
        'headline_line1', 'The Tapas Journal.',
        'headline_line2', 'Notes from the room.',
        'description',    'Essays, interviews, marginalia, and a recipe or two — written by readers, for readers.',
        'cta_text',       'Read the latest',
        'cta_href',       '#archive',
        'image_url',      'HERO-JOURNAL.png'
      )),
      jsonb_build_object('id', 'blog_featured', 'type', 'tapas_blog_featured', 'props', jsonb_build_object()),
      jsonb_build_object('id', 'blog_sidebar',  'type', 'tapas_blog_sidebar',  'props', jsonb_build_object()),
      jsonb_build_object('id', 'blog_archive',  'type', 'tapas_blog_archive', 'props', jsonb_build_object(
        'eyebrow',      'The Archive',
        'heading_html', 'More from <em>the room.</em>',
        'lede',         'Essays and interviews, sorted however’s useful.'
      )),
      jsonb_build_object('id', 'blog_dispatch', 'type', 'tapas_newsletter',   'props', jsonb_build_object(
        'headline',         '✉ The Tapas Dispatch',
        'subtext',          'Monthly book picks, member events, and quiet announcements.',
        'placeholder',      'Your email address',
        'button_text',      'Subscribe',
        'background_color', '#1F1B16'
      ))
    )
  );
  v_existing jsonb;
  v_next     jsonb;
begin
  select value into v_existing from public.app_settings where key = 'store_content_v2' limit 1;
  if v_existing is null then
    v_next := jsonb_build_object('pages', jsonb_build_object('blog', v_blog));
    insert into public.app_settings (key, value, updated_at) values ('store_content_v2', v_next, now());
  else
    v_next := jsonb_set(coalesce(v_existing, '{}'::jsonb), '{pages,blog}', v_blog, true);
    update public.app_settings set value = v_next, updated_at = now() where key = 'store_content_v2';
  end if;
end $$;
