-- ============================================================================
-- 20260428_seed_shop_blocks_v2.sql
--
-- Seeds the Shop page (pages.shop) in store_content_v2:
--   1. tapas_hero            — page hero
--   2. tapas_shop_featured   — Book of the Month spotlight
--   3. tapas_shop_browser    — full filter+toolbar+grid+pagination
--                              (self-contained state, live useShopBooks)
--
-- pages.shop.use_blocks=false; flip via SQL or Page Settings.
-- ============================================================================

do $$
declare
  v_shop jsonb := jsonb_build_object(
    'name', 'Shop',
    'slug', '/shop',
    'use_blocks', false,
    'blocks', jsonb_build_array(
      jsonb_build_object('id', 'shop_hero', 'type', 'tapas_hero', 'props', jsonb_build_object(
        'headline_line1', 'A small, considered',
        'headline_line2', 'shelf for sale.',
        'description',    'Curated by us — fiction in translation, debut novels, slim hardbacks. New titles every Friday.',
        'cta_text',       'Browse the catalogue',
        'cta_href',       '#browser',
        'image_url',      'HERO-SHOP.png'
      )),
      jsonb_build_object('id', 'shop_featured', 'type', 'tapas_shop_featured', 'props', jsonb_build_object(
        'eyebrow', 'Book of the Month',
        'member_discount', true
      )),
      jsonb_build_object('id', 'shop_browser', 'type', 'tapas_shop_browser', 'props', jsonb_build_object(
        'page_size', 12,
        'member_discount_default', true
      ))
    )
  );
  v_existing jsonb;
  v_next     jsonb;
begin
  select value into v_existing from public.app_settings where key = 'store_content_v2' limit 1;
  if v_existing is null then
    v_next := jsonb_build_object('pages', jsonb_build_object('shop', v_shop));
    insert into public.app_settings (key, value, updated_at) values ('store_content_v2', v_next, now());
  else
    v_next := jsonb_set(coalesce(v_existing, '{}'::jsonb), '{pages,shop}', v_shop, true);
    update public.app_settings set value = v_next, updated_at = now() where key = 'store_content_v2';
  end if;
end $$;
