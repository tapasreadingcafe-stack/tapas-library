-- =====================================================================
-- 20260411_ecommerce_rls.sql
--
-- Phase 2 of the e-commerce buildout.
--
-- ⚠️  DO NOT RUN THIS MIGRATION ON PRODUCTION FIRST.
--
-- This migration enables Row-Level Security on every shared table and
-- adds policies that gate access via public.is_staff() + the calling
-- user's auth.uid().
--
-- Runbook:
--   1. Create a Supabase branch from the main project.
--   2. Run 20260411_ecommerce.sql followed by this file on the branch.
--   3. Point the staff dashboard at the branch (REACT_APP_SUPABASE_URL
--      env var override) and click through every page listed in the
--      verification section of the plan. Confirm nothing 401s or
--      returns empty results.
--   4. Sign up a fresh customer on tapas-store pointed at the branch,
--      place a test order, confirm it is visible to the staff account
--      and invisible to a second customer.
--   5. Merge the branch only after both checks pass.
--
-- Emergency rollback:
--     ALTER TABLE <table> DISABLE ROW LEVEL SECURITY;
--
-- All statements are guarded with CREATE POLICY IF NOT EXISTS (or
-- DROP POLICY IF EXISTS + CREATE POLICY pairs where IF NOT EXISTS
-- isn't supported).
-- =====================================================================

-- Helper shorthand used in several policies below.
-- Resolves the calling user's linked member_id, or NULL.
CREATE OR REPLACE FUNCTION public.current_member_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT id FROM public.members WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_member_id() TO authenticated, anon;

-- ---------------------------------------------------------------------
-- books
--     Anon/customer: read rows where store_visible = true only.
--     Staff: full read/write.
-- ---------------------------------------------------------------------
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS books_select ON public.books;
CREATE POLICY books_select ON public.books
    FOR SELECT
    USING (public.is_staff() OR store_visible = true);

DROP POLICY IF EXISTS books_insert ON public.books;
CREATE POLICY books_insert ON public.books
    FOR INSERT
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS books_update ON public.books;
CREATE POLICY books_update ON public.books
    FOR UPDATE
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS books_delete ON public.books;
CREATE POLICY books_delete ON public.books
    FOR DELETE
    USING (public.is_staff());

-- ---------------------------------------------------------------------
-- members
--     Customer: read/update own row (auth_user_id = auth.uid()).
--     Staff: full access.
-- ---------------------------------------------------------------------
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS members_select ON public.members;
CREATE POLICY members_select ON public.members
    FOR SELECT
    USING (public.is_staff() OR auth_user_id = auth.uid());

DROP POLICY IF EXISTS members_insert ON public.members;
CREATE POLICY members_insert ON public.members
    FOR INSERT
    WITH CHECK (public.is_staff() OR auth_user_id = auth.uid());

DROP POLICY IF EXISTS members_update ON public.members;
CREATE POLICY members_update ON public.members
    FOR UPDATE
    USING (public.is_staff() OR auth_user_id = auth.uid())
    WITH CHECK (public.is_staff() OR auth_user_id = auth.uid());

DROP POLICY IF EXISTS members_delete ON public.members;
CREATE POLICY members_delete ON public.members
    FOR DELETE
    USING (public.is_staff());

-- ---------------------------------------------------------------------
-- customer_orders
--     Customer: read/insert own, cannot update once placed.
--     Staff: full access (for fulfillment workflow).
-- ---------------------------------------------------------------------
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_orders_select ON public.customer_orders;
CREATE POLICY customer_orders_select ON public.customer_orders
    FOR SELECT
    USING (public.is_staff() OR member_id = public.current_member_id());

DROP POLICY IF EXISTS customer_orders_insert ON public.customer_orders;
CREATE POLICY customer_orders_insert ON public.customer_orders
    FOR INSERT
    WITH CHECK (public.is_staff() OR member_id = public.current_member_id());

DROP POLICY IF EXISTS customer_orders_update ON public.customer_orders;
CREATE POLICY customer_orders_update ON public.customer_orders
    FOR UPDATE
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- ---------------------------------------------------------------------
-- customer_order_items
--     Gated through the parent order.
-- ---------------------------------------------------------------------
ALTER TABLE public.customer_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_order_items_select ON public.customer_order_items;
CREATE POLICY customer_order_items_select ON public.customer_order_items
    FOR SELECT
    USING (
        public.is_staff()
        OR order_id IN (
            SELECT id FROM public.customer_orders
            WHERE member_id = public.current_member_id()
        )
    );

DROP POLICY IF EXISTS customer_order_items_insert ON public.customer_order_items;
CREATE POLICY customer_order_items_insert ON public.customer_order_items
    FOR INSERT
    WITH CHECK (
        public.is_staff()
        OR order_id IN (
            SELECT id FROM public.customer_orders
            WHERE member_id = public.current_member_id()
        )
    );

-- ---------------------------------------------------------------------
-- customer_order_status_history
--     Read-only to the order's owner; writes only via the trigger
--     (which runs with definer privileges) or staff.
-- ---------------------------------------------------------------------
ALTER TABLE public.customer_order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_order_status_history_select ON public.customer_order_status_history;
CREATE POLICY customer_order_status_history_select ON public.customer_order_status_history
    FOR SELECT
    USING (
        public.is_staff()
        OR order_id IN (
            SELECT id FROM public.customer_orders
            WHERE member_id = public.current_member_id()
        )
    );

-- ---------------------------------------------------------------------
-- wishlists
-- ---------------------------------------------------------------------
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wishlists_all ON public.wishlists;
CREATE POLICY wishlists_all ON public.wishlists
    FOR ALL
    USING (public.is_staff() OR member_id = public.current_member_id())
    WITH CHECK (public.is_staff() OR member_id = public.current_member_id());

-- ---------------------------------------------------------------------
-- reservations
-- ---------------------------------------------------------------------
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reservations_all ON public.reservations;
CREATE POLICY reservations_all ON public.reservations
    FOR ALL
    USING (public.is_staff() OR member_id = public.current_member_id())
    WITH CHECK (public.is_staff() OR member_id = public.current_member_id());

-- ---------------------------------------------------------------------
-- reviews
--     Anyone can read (public reviews). Only owner can write.
-- ---------------------------------------------------------------------
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reviews_select ON public.reviews;
CREATE POLICY reviews_select ON public.reviews
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS reviews_insert ON public.reviews;
CREATE POLICY reviews_insert ON public.reviews
    FOR INSERT
    WITH CHECK (public.is_staff() OR member_id = public.current_member_id());

DROP POLICY IF EXISTS reviews_update ON public.reviews;
CREATE POLICY reviews_update ON public.reviews
    FOR UPDATE
    USING (public.is_staff() OR member_id = public.current_member_id())
    WITH CHECK (public.is_staff() OR member_id = public.current_member_id());

DROP POLICY IF EXISTS reviews_delete ON public.reviews;
CREATE POLICY reviews_delete ON public.reviews
    FOR DELETE
    USING (public.is_staff() OR member_id = public.current_member_id());

-- ---------------------------------------------------------------------
-- circulation
--     Customer: can read own borrow history. No writes.
--     Staff: full access.
-- ---------------------------------------------------------------------
ALTER TABLE public.circulation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS circulation_select ON public.circulation;
CREATE POLICY circulation_select ON public.circulation
    FOR SELECT
    USING (public.is_staff() OR member_id = public.current_member_id());

DROP POLICY IF EXISTS circulation_write ON public.circulation;
CREATE POLICY circulation_write ON public.circulation
    FOR ALL
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- ---------------------------------------------------------------------
-- staff
--     Staff only. Nobody else can see the staff list.
-- ---------------------------------------------------------------------
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_all ON public.staff;
CREATE POLICY staff_all ON public.staff
    FOR ALL
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- ---------------------------------------------------------------------
-- Staff-only tables
--     These should never be accessible to customers. We don't need
--     customer read access for the store MVP. If that changes later,
--     add a targeted SELECT policy.
-- ---------------------------------------------------------------------
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'cafe_menu_items',
        'cafe_orders',
        'cafe_order_items',
        'cafe_inventory',
        'cafe_expenses',
        'pos_transactions',
        'pos_transaction_items',
        'events',
        'event_registrations',
        'event_attendance',
        'vendors',
        'purchase_orders',
        'purchase_order_items',
        'app_settings',
        'family_members'
    ] LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('DROP POLICY IF EXISTS %I_staff_only ON public.%I', t, t);
            EXECUTE format(
                'CREATE POLICY %I_staff_only ON public.%I FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff())',
                t, t
            );
        END IF;
    END LOOP;
END $$;

-- =====================================================================
-- END 20260411_ecommerce_rls.sql
-- =====================================================================
