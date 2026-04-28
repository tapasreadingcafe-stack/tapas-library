-- ============================================================================
-- 20260428_seed_about_blocks_v2.sql
--
-- Seeds the About page (pages.about) in store_content_v2 with 7 blocks:
--   1. tapas_hero        — page hero
--   2. tapas_manifesto   — drop-cap manifesto (live useAbout)
--   3. tapas_stats_strip — stats strip      (live useAbout)
--   4. tapas_timeline    — brief history    (live useAbout)
--   5. tapas_compromises — three cards      (live useAbout)
--   6. tapas_team_grid   — team             (live useAbout)
--   7. tapas_press_quotes — press quotes    (live useAbout)
--
-- pages.about.use_blocks=false; flip via SQL or Page Settings to go live.
-- ============================================================================

do $$
declare
  v_about jsonb := jsonb_build_object(
    'name', 'About',
    'slug', '/about',
    'use_blocks', false,
    'blocks', jsonb_build_array(
      jsonb_build_object('id', 'about_hero',        'type', 'tapas_hero', 'props', jsonb_build_object(
        'headline_line1', 'A reading café,',
        'headline_line2', 'and a small library.',
        'description',    'We opened with a stove, a lease, and one personal library that had outgrown two apartments. Five years on, we still pour and stock and cook ourselves.',
        'cta_text',       'Read the manifesto',
        'cta_href',       '#manifesto',
        'image_url',      'HERO-ABOUT.png'
      )),
      jsonb_build_object('id', 'about_manifesto',   'type', 'tapas_manifesto',   'props', jsonb_build_object()),
      jsonb_build_object('id', 'about_stats',       'type', 'tapas_stats_strip', 'props', jsonb_build_object()),
      jsonb_build_object('id', 'about_history',     'type', 'tapas_timeline',    'props', jsonb_build_object()),
      jsonb_build_object('id', 'about_compromises', 'type', 'tapas_compromises', 'props', jsonb_build_object()),
      jsonb_build_object('id', 'about_team',        'type', 'tapas_team_grid',   'props', jsonb_build_object()),
      jsonb_build_object('id', 'about_press',       'type', 'tapas_press_quotes','props', jsonb_build_object())
    )
  );
  v_existing jsonb;
  v_next     jsonb;
begin
  select value into v_existing from public.app_settings where key = 'store_content_v2' limit 1;
  if v_existing is null then
    v_next := jsonb_build_object('pages', jsonb_build_object('about', v_about));
    insert into public.app_settings (key, value, updated_at) values ('store_content_v2', v_next, now());
  else
    v_next := jsonb_set(coalesce(v_existing, '{}'::jsonb), '{pages,about}', v_about, true);
    update public.app_settings set value = v_next, updated_at = now() where key = 'store_content_v2';
  end if;
end $$;
