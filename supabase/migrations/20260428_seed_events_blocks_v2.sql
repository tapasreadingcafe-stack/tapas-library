-- ============================================================================
-- 20260428_seed_events_blocks_v2.sql
--
-- Seeds the Events page (pages.events) in store_content_v2 with the
-- block tree composing today's live /events page:
--   1. tapas_hero               — page hero
--   2. tapas_section            — "Upcoming events" header
--   3. tapas_events_calendar    — calendar grid (live useEvents)
--   4. tapas_section            — "Weekly clubs" header
--   5. tapas_clubs_grid         — clubs grid (live useClubs)
--   6. tapas_featured_supper    — supper card (live useFeaturedSupper)
--
-- pages.events.use_blocks=false so storefront keeps rendering the
-- hand-coded /events until staff opt in (same pattern as Home).
-- jsonb_set merges only into pages.events, leaving sibling pages
-- (home, etc.) untouched.
-- ============================================================================

do $$
declare
  v_events jsonb := jsonb_build_object(
    'name', 'Events',
    'slug', '/events',
    'use_blocks', false,
    'blocks', jsonb_build_array(
      jsonb_build_object(
        'id',    'events_hero',
        'type',  'tapas_hero',
        'props', jsonb_build_object(
          'headline_line1', 'Pull up a chair.',
          'headline_line2', 'Find your people.',
          'description',    'Weekly clubs, poetry suppers, translator nights, and the occasional silent Saturday. All welcome — members first.',
          'cta_text',       'See the calendar',
          'cta_href',       '#upcoming',
          'image_url',      'HERO-EVENTS.png'
        )
      ),
      jsonb_build_object(
        'id',    'events_upcoming_header',
        'type',  'tapas_section',
        'props', jsonb_build_object(
          'eyebrow',          'This week',
          'heading',          'Upcoming events.',
          'subtext',          'All events are free for members; guest seats are ₹650 and include a drink. Book ahead — our room holds 24.',
          'text_align',       'left',
          'background_color', '#fffaf0',
          'padding_y',        40
        )
      ),
      jsonb_build_object(
        'id',    'events_calendar',
        'type',  'tapas_events_calendar',
        'props', jsonb_build_object(
          'eyebrow',      'Upcoming Events',
          'heading_html', 'On the calendar <em>this season.</em>',
          'lede',         'Sorted by date — the next five gatherings.',
          'limit',        12,
          'cta_href',     '/events'
        )
      ),
      jsonb_build_object(
        'id',    'events_clubs_header',
        'type',  'tapas_section',
        'props', jsonb_build_object(
          'eyebrow',          'Weekly clubs',
          'heading',          'Find a chair that fits.',
          'subtext',          'Six ongoing groups. Come once as a guest to find your people, then keep your seat — we hold it.',
          'text_align',       'left',
          'background_color', '#fffaf0',
          'padding_y',        40
        )
      ),
      jsonb_build_object(
        'id',    'events_clubs',
        'type',  'tapas_clubs_grid',
        'props', jsonb_build_object(
          'eyebrow',      'Weekly clubs',
          'heading_html', 'Find a chair <em>that fits.</em>',
          'lede',         'Six ongoing groups. Come once as a guest to find your people, then keep your seat — we hold it.'
        )
      ),
      jsonb_build_object(
        'id',    'events_supper',
        'type',  'tapas_featured_supper',
        'props', jsonb_build_object(
          'menu_kicker', 'The menu',
          'menu_title',  'Read & eaten.'
        )
      )
    )
  );
  v_existing jsonb;
  v_next     jsonb;
begin
  select value into v_existing
    from public.app_settings
   where key = 'store_content_v2'
   limit 1;

  if v_existing is null then
    v_next := jsonb_build_object('pages', jsonb_build_object('events', v_events));
    insert into public.app_settings (key, value, updated_at)
    values ('store_content_v2', v_next, now());
  else
    v_next := jsonb_set(
      coalesce(v_existing, '{}'::jsonb),
      '{pages,events}',
      v_events,
      true
    );
    update public.app_settings
       set value = v_next,
           updated_at = now()
     where key = 'store_content_v2';
  end if;
end $$;
