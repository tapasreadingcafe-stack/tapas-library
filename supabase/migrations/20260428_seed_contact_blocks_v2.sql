-- ============================================================================
-- 20260428_seed_contact_blocks_v2.sql
--
-- Seeds the Contact page (pages.contact) in store_content_v2:
--   1. tapas_hero            — page hero
--   2. tapas_find_us         — address + contacts (live useContactInfo)
--   3. tapas_hours_strip     — weekly hours (live useHours)
--   4. tapas_faq_accordion   — FAQ accordion (live useFaqs)
--
-- pages.contact.use_blocks=false so the storefront keeps rendering
-- the hand-coded /contact until staff opt in. Same idempotent jsonb_set
-- pattern as the home + events seeds.
-- ============================================================================

do $$
declare
  v_contact jsonb := jsonb_build_object(
    'name', 'Contact',
    'slug', '/contact',
    'use_blocks', false,
    'blocks', jsonb_build_array(
      jsonb_build_object(
        'id',    'contact_hero',
        'type',  'tapas_hero',
        'props', jsonb_build_object(
          'headline_line1', 'Pass through the door,',
          'headline_line2', 'find your seat.',
          'description',    'Tapas is a reading café and lending library on the corner. Drop in any afternoon — or get in touch first.',
          'cta_text',       'Get directions',
          'cta_href',       '#map',
          'image_url',      'HERO-CONTACT.png'
        )
      ),
      jsonb_build_object(
        'id',    'contact_find_us',
        'type',  'tapas_find_us',
        'props', jsonb_build_object(
          'eyebrow',      'Find us',
          'heading_html', 'The <em>room itself.</em>',
          'lede',         'The fastest way is the front door. For everything else:'
        )
      ),
      jsonb_build_object(
        'id',    'contact_hours',
        'type',  'tapas_hours_strip',
        'props', jsonb_build_object()
      ),
      jsonb_build_object(
        'id',    'contact_faqs',
        'type',  'tapas_faq_accordion',
        'props', jsonb_build_object(
          'eyebrow',      'Good to know',
          'heading_html', 'A few <em>common questions.</em>',
          'lede',         'If you can’t find it here, just ask us at the counter.'
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
    v_next := jsonb_build_object('pages', jsonb_build_object('contact', v_contact));
    insert into public.app_settings (key, value, updated_at)
    values ('store_content_v2', v_next, now());
  else
    v_next := jsonb_set(
      coalesce(v_existing, '{}'::jsonb),
      '{pages,contact}',
      v_contact,
      true
    );
    update public.app_settings
       set value = v_next,
           updated_at = now()
     where key = 'store_content_v2';
  end if;
end $$;
