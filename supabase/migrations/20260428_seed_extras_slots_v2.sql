-- ============================================================================
-- 20260428_seed_extras_slots_v2.sql
--
-- Phase 3 of the visual-builder rollout. Adds editable "extras" slots
-- to three transactional pages so staff can drop promo bands, related-
-- content sections, FAQs, etc. ABOVE or BELOW the working transactional
-- UI without replacing it.
--
--   * pages.cart             (above_blocks + below_blocks)
--   * pages.book_detail      (above_blocks + below_blocks)
--   * pages.order_success    (above_blocks + below_blocks)
--
-- Each slot starts as an empty array — zero impact until staff drops a
-- block into it. The storefront's <BlockSlot> helper renders each slot
-- via the existing PageRenderer machinery.
--
-- These pages have no `use_blocks` flag — the transactional UI always
-- renders. The slots are purely additive.
-- ============================================================================

do $$
declare
  v_existing jsonb;
  v_next     jsonb;
  v_make_page jsonb;
begin
  v_make_page := jsonb_build_object(
    'name',          NULL,
    'slug',          NULL,
    'above_blocks',  '[]'::jsonb,
    'below_blocks',  '[]'::jsonb
  );

  select value into v_existing from public.app_settings where key = 'store_content_v2' limit 1;
  if v_existing is null then
    v_existing := jsonb_build_object('pages', '{}'::jsonb);
  end if;

  -- pages.cart (only set if missing — never clobber existing edits)
  if v_existing #> '{pages,cart}' is null then
    v_next := jsonb_set(v_existing, '{pages,cart}',
      v_make_page || jsonb_build_object('name', 'Cart', 'slug', '/cart'),
      true);
  else
    v_next := v_existing;
    if v_next #> '{pages,cart,above_blocks}' is null then
      v_next := jsonb_set(v_next, '{pages,cart,above_blocks}', '[]'::jsonb, true);
    end if;
    if v_next #> '{pages,cart,below_blocks}' is null then
      v_next := jsonb_set(v_next, '{pages,cart,below_blocks}', '[]'::jsonb, true);
    end if;
  end if;

  -- pages.book_detail
  if v_next #> '{pages,book_detail}' is null then
    v_next := jsonb_set(v_next, '{pages,book_detail}',
      v_make_page || jsonb_build_object('name', 'Book detail', 'slug', '/books/:id'),
      true);
  else
    if v_next #> '{pages,book_detail,above_blocks}' is null then
      v_next := jsonb_set(v_next, '{pages,book_detail,above_blocks}', '[]'::jsonb, true);
    end if;
    if v_next #> '{pages,book_detail,below_blocks}' is null then
      v_next := jsonb_set(v_next, '{pages,book_detail,below_blocks}', '[]'::jsonb, true);
    end if;
  end if;

  -- pages.order_success
  if v_next #> '{pages,order_success}' is null then
    v_next := jsonb_set(v_next, '{pages,order_success}',
      v_make_page || jsonb_build_object('name', 'Order success', 'slug', '/order/:id'),
      true);
  else
    if v_next #> '{pages,order_success,above_blocks}' is null then
      v_next := jsonb_set(v_next, '{pages,order_success,above_blocks}', '[]'::jsonb, true);
    end if;
    if v_next #> '{pages,order_success,below_blocks}' is null then
      v_next := jsonb_set(v_next, '{pages,order_success,below_blocks}', '[]'::jsonb, true);
    end if;
  end if;

  if v_existing is null or v_next <> v_existing then
    insert into public.app_settings (key, value, updated_at)
    values ('store_content_v2', v_next, now())
    on conflict (key) do update set value = excluded.value, updated_at = now();
  end if;
end $$;
