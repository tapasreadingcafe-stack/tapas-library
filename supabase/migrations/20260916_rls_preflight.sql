-- =====================================================================
-- PRE-FLIGHT for 20260916_rls_lockdown_sensitive_tables.sql
-- READ-ONLY. Changes nothing. Run it, look at the three results, then run
-- the lockdown.
-- =====================================================================

-- ── A. Will the dashboard still recognise you as staff? ─────────────────
-- is_staff() matches the login email against active rows in `staff`.
-- Every login that uses the dashboard should show  is_staff_row = true.
-- Any `false` here: that person would see an EMPTY POS, bills and orders
-- after the lockdown. Add them to `staff` first.
select u.email                       as dashboard_login,
       (s.email is not null)         as is_staff_row,
       coalesce(s.is_active, true)   as active,
       u.last_sign_in_at
from auth.users u
left join public.staff s on lower(s.email) = lower(u.email)
order by u.last_sign_in_at desc nulls last
limit 25;


-- ── B. Which public tables have RLS switched OFF? ───────────────────────
-- This is the advisor's rls_disabled_in_public list. Anything here that
-- the lockdown doesn't cover needs a look too — paste it back.
select c.relname as rls_off_table
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and not c.relrowsecurity
order by 1;


-- ── C. What the lockdown is about to replace ────────────────────────────
-- For the record. Look for qual = 'true' — those are the wide-open ones.
select tablename, policyname, cmd, roles::text, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'event_registrations','pos_transactions','pos_transaction_items','circulation',
    'cafe_orders','cafe_order_items','promo_codes','store_promo_codes','app_settings',
    'gst_settings','ab_tests','content_calendar','cafe_inventory','birthday_offers',
    'book_id_sequences')
order by tablename, policyname;
