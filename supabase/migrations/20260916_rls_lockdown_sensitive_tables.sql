-- =====================================================================
-- Lock down tables the public anon key could read.
--
-- Prompted by Supabase's security advisor (rls_disabled_in_public, 13 Sep
-- 2026). Probing with the anon key — the key baked into the public website,
-- so effectively anyone's — showed these readable in full on 16 Sep:
--
--   event_registrations   customers' names, phones, emails, payment refs
--   pos_transactions(+items), cafe_orders(+items)   every bill and order
--   circulation           who borrowed which book
--   promo_codes, store_promo_codes                  every discount code
--   app_settings          incl. integrations.whatsapp credentials
--   gst_settings, ab_tests, content_calendar, cafe_inventory
--
-- Where RLS was off, the anon key could also UPDATE and DELETE them.
--
-- WHY EVERY EXISTING POLICY IS DROPPED FIRST
-- Postgres ORs permissive policies together. Some of these tables were set
-- up with a blanket `USING (true)` policy (EventListing's old setup SQL
-- names one "open"). Adding a strict policy beside it changes nothing: the
-- open one still lets everyone in. So for each table below, this script
-- removes all policies and installs the complete intended set. After it
-- runs, the policies listed here are the only ones on these tables.
--
-- WHO NEEDS WHAT (checked against the code, 16 Sep):
--   * Staff dashboard — everything, via is_staff() (staff table, matched on
--     the login email). Includes /kiosk, which sits inside the staff login.
--   * Public website:
--       - event_registrations: INSERT only, from the register form. Both
--         call sites insert without reading back, so no SELECT is granted.
--       - circulation: a logged-in member reads THEIR OWN loans (Profile,
--         Member dashboard, review form). Nobody else's.
--       - app_settings: reads only the website-content rows. The
--         `integrations` row it also reads is for a submission webhook
--         that is not configured, so closing it breaks nothing.
--   * next_book_id() is SECURITY DEFINER, so book_id_sequences can close
--     entirely without affecting book creation.
--   * Edge functions use the service role, which bypasses RLS.
--
-- Safety contract:
--   * Idempotent: safe to run twice.
--   * A table that doesn't exist on this install is skipped, not an error.
--   * Rollback is at the bottom, commented out.
--
-- RUN THE PRE-FLIGHT FIRST (20260916_rls_preflight.sql). If your own
-- dashboard login isn't an active row in `staff`, this lockdown would make
-- the POS, bills and orders look empty to you.
-- =====================================================================

begin;

-- ── helper: clear a table's policies and turn RLS on ────────────────────
create or replace function pg_temp.reset_policies(tbl text)
returns boolean language plpgsql as $$
declare p record;
begin
  if to_regclass('public.' || tbl) is null then
    raise notice 'skip %: table does not exist here', tbl;
    return false;
  end if;
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = tbl loop
    execute format('drop policy %I on public.%I', p.policyname, tbl);
  end loop;
  execute format('alter table public.%I enable row level security', tbl);
  return true;
end $$;


-- ── 1. Staff-only tables ─────────────────────────────────────────────────
-- The website never touches these.
do $$
declare t text;
begin
  foreach t in array array[
    'pos_transactions', 'pos_transaction_items',
    'cafe_orders', 'cafe_order_items',
    'promo_codes', 'store_promo_codes',
    'gst_settings', 'ab_tests', 'content_calendar', 'cafe_inventory',
    'birthday_offers', 'book_id_sequences'
  ] loop
    if pg_temp.reset_policies(t) then
      execute format(
        'create policy staff_all on public.%I for all to authenticated
           using (public.is_staff()) with check (public.is_staff())', t);
    end if;
  end loop;
end $$;


-- ── 2. event_registrations — staff read/write, public may only submit ─────
do $$
begin
  if pg_temp.reset_policies('event_registrations') then
    create policy staff_all on public.event_registrations
      for all to authenticated
      using (public.is_staff()) with check (public.is_staff());

    -- The register form. No SELECT to go with it: a visitor can add a
    -- booking but can't read anyone's, including their own.
    create policy public_can_register on public.event_registrations
      for insert to anon, authenticated
      with check (event_id is not null);
  end if;
end $$;


-- ── 3. circulation — staff, plus a member's own loans ────────────────────
do $$
begin
  if pg_temp.reset_policies('circulation') then
    create policy staff_all on public.circulation
      for all to authenticated
      using (public.is_staff()) with check (public.is_staff());

    -- Members are linked to their login by members.auth_user_id (the
    -- website's AuthContext sets it on first sign-in).
    create policy member_reads_own_loans on public.circulation
      for select to authenticated
      using (member_id in (select m.id from public.members m where m.auth_user_id = auth.uid()));
  end if;
end $$;


-- ── 4. app_settings — staff, plus the website-content rows ───────────────
do $$
begin
  if pg_temp.reset_policies('app_settings') then
    create policy staff_all on public.app_settings
      for all to authenticated
      using (public.is_staff()) with check (public.is_staff());

    -- Exactly what tapas-store's SiteContent reads (CONTENT_ROW_KEYS, live
    -- and draft). Everything else in this table — credentials, fine rates,
    -- UPI QR, barcode templates — stays staff-only.
    create policy public_reads_site_content on public.app_settings
      for select to anon, authenticated
      using (key in ('store_content', 'store_content_v2',
                     'store_content_draft', 'store_content_v2_draft'));
  end if;
end $$;

commit;


-- =====================================================================
-- ROLLBACK — only if something at the counter breaks and you need the old
-- (open) behaviour back while it's fixed. This re-opens the data; it is
-- not a fix. Uncomment and run.
-- =====================================================================
-- do $$
-- declare t text; p record;
-- begin
--   foreach t in array array[
--     'pos_transactions','pos_transaction_items','cafe_orders','cafe_order_items',
--     'promo_codes','store_promo_codes','gst_settings','ab_tests','content_calendar',
--     'cafe_inventory','birthday_offers','book_id_sequences',
--     'event_registrations','circulation','app_settings'
--   ] loop
--     if to_regclass('public.' || t) is not null then
--       for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
--         execute format('drop policy %I on public.%I', p.policyname, t);
--       end loop;
--       execute format('create policy temporary_open on public.%I for all using (true) with check (true)', t);
--     end if;
--   end loop;
-- end $$;
