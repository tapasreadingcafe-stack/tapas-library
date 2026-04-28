-- ============================================================================
-- 20260428_seed_home_blocks_v2.sql
--
-- Seeds the `store_content_v2` row in app_settings with the Home page
-- composed as a block tree. After this migration:
--
--   * Editor (WebsiteEditor.js, reads store_content_v2) sees a Home
--     page with 7 blocks matching the live design.
--   * Storefront keeps rendering the hand-coded Home until the
--     `pages.home.use_blocks` flag is flipped to true (Home.js will
--     check it in a follow-up code change).
--
-- jsonb_set merges the home page in without clobbering any sibling
-- pages, brand, typography, or component definitions already living
-- in store_content_v2 from the legacy editor seed.
--
-- Block contents mirror the current live home design:
--   1. tapas_hero               — lime wave hero
--   2. tapas_services           — 3 service cards
--   3. tapas_new_arrivals       — live shop catalogue (source=live)
--   4. tapas_pricing_split      — Drop-in vs Membership panels
--   5. tapas_events_calendar    — live upcoming events
--   6. tapas_featured_testimonial — featured home_testimonials row
--   7. tapas_newsletter         — dispatch signup
--
-- Block IDs are stable strings so subsequent migrations / re-runs
-- update existing rows instead of producing duplicates.
-- ============================================================================

do $$
declare
  v_home jsonb := jsonb_build_object(
    'name', 'Home',
    'slug', '/',
    'use_blocks', false,        -- storefront opt-in flag (off by default)
    'blocks', jsonb_build_array(
      jsonb_build_object(
        'id',    'home_hero',
        'type',  'tapas_hero',
        'props', jsonb_build_object(
          'headline_line1', 'Welcome to Tapas',
          'headline_line2', 'Where Stories Begin',
          'description',    'A reading café and lending library — drop in for an afternoon, become a member, or take a book home.',
          'cta_text',       'Browse the shop',
          'cta_href',       '/shop',
          'image_url',      'HERO-LIBRARY.png'
        )
      ),
      jsonb_build_object(
        'id',    'home_services',
        'type',  'tapas_services',
        'props', jsonb_build_object(
          'eyebrow', 'Our Services',
          'heading', 'Three ways to use the room.',
          'items', jsonb_build_array(
            jsonb_build_object('icon', '📚', 'title', 'Buying Books',  'body', 'A small, carefully chosen shelf for sale. Browse online or in store.', 'cta_text', 'Visit the shop', 'cta_href', '/shop'),
            jsonb_build_object('icon', '🪪', 'title', 'Lending Library','body', 'Over 2,400 books you can borrow on the honor system.',                  'cta_text', 'Borrow a book', 'cta_href', '/library'),
            jsonb_build_object('icon', '🎤', 'title', 'Events & Clubs','body', 'Six weekly clubs, poetry suppers, and silent reading Saturdays.',     'cta_text', 'See the calendar','cta_href', '/events')
          )
        )
      ),
      jsonb_build_object(
        'id',    'home_new_arrivals',
        'type',  'tapas_new_arrivals',
        'props', jsonb_build_object(
          'eyebrow',          'New on the shelf',
          'source',           'live',
          'limit',            8,
          'show_add_to_cart', true,
          'items',            jsonb_build_array()
        )
      ),
      jsonb_build_object(
        'id',    'home_pricing',
        'type',  'tapas_pricing_split',
        'props', jsonb_build_object(
          'eyebrow',           'Pricing & Plans',
          'heading_html',      'Two ways to <em>pull up a chair.</em>',
          'lede',              'Drop in whenever you like — or become a member and unlock every club, a quarterly book, and 10% off the kitchen.',
          'left_kicker',       'Drop-in',
          'left_title',        'The Reading Room',
          'left_body',         'Free to enter. Borrow one book at a time, read all afternoon. Buy a coffee or a plate if the mood strikes.',
          'left_features',     jsonb_build_array('Lending library, honor system', 'Wi-Fi, quiet tables, long hours', 'One guest club visit per month'),
          'left_price',        'Free',
          'left_cta_text',     'Visit today',
          'left_cta_href',     '/library',
          'right_kicker',      'Membership',
          'right_title',       'The Chair',
          'right_body',        'A seat at every club, a book of your choice each quarter, 10% off the kitchen, and first dibs on supper events.',
          'right_features',    jsonb_build_array('All six weekly book clubs', 'One book per quarter, on us', '10% off food, wine & coffee', 'Priority RSVP for supper events'),
          'right_price',       '₹467',
          'right_price_suffix','/month',
          'right_cta_text',    'Become a member',
          'right_cta_href',    '/sign-up'
        )
      ),
      jsonb_build_object(
        'id',    'home_events',
        'type',  'tapas_events_calendar',
        'props', jsonb_build_object(
          'eyebrow',      'Upcoming Events',
          'heading_html', 'On the calendar <em>this season.</em>',
          'lede',         'Weekly clubs, translator evenings, poetry suppers, and the occasional quiet Saturday. All welcome, members first.',
          'limit',        5,
          'cta_href',     '/events'
        )
      ),
      jsonb_build_object(
        'id',    'home_testimonial',
        'type',  'tapas_featured_testimonial',
        'props', jsonb_build_object(
          'source',         'live',
          'background',     '#FF934A',
          'kicker',         'What readers say',
          'quote_html',     'My new shelf is so much faster and easier to browse than my old library app.',
          'author_name',    'Corey Valdez',
          'author_context', 'Founder at Zenix',
          'initials',       'CV'
        )
      ),
      jsonb_build_object(
        'id',    'home_dispatch',
        'type',  'tapas_newsletter',
        'props', jsonb_build_object(
          'headline',         '✉ The Tapas Dispatch',
          'subtext',          'Monthly book picks, member events, and quiet announcements.',
          'placeholder',      'Your email address',
          'button_text',      'Subscribe',
          'background_color', '#1F1B16'
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
    v_next := jsonb_build_object('pages', jsonb_build_object('home', v_home));
    insert into public.app_settings (key, value, updated_at)
    values ('store_content_v2', v_next, now());
  else
    -- Replace pages.home, leave everything else (other pages, brand,
    -- typography, components, classes, modes, etc.) untouched.
    v_next := jsonb_set(
      coalesce(v_existing, '{}'::jsonb),
      '{pages,home}',
      v_home,
      true
    );
    update public.app_settings
       set value = v_next,
           updated_at = now()
     where key = 'store_content_v2';
  end if;
end $$;

-- ────────────────────────────────────────────────────────────────────
-- Note for whoever applies this:
-- The pages.home.use_blocks flag is `false` so storefront Home.js
-- continues to render the hand-coded layout. To preview the block
-- version end-to-end:
--   * Visit any storefront URL with `?v2=1` (deep-merges v2 over v1)
--   * Then once the home page Home.js change ships, set
--     pages.home.use_blocks=true (either via SQL or via the editor's
--     Page Settings panel) to flip the live storefront over.
-- ────────────────────────────────────────────────────────────────────
