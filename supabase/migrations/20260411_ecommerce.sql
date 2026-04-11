-- =====================================================================
-- 20260411_ecommerce.sql
--
-- Phase 1 of the tapas-library e-commerce buildout.
--
-- Additive migration: adds columns, tables, functions, and triggers
-- for the customer-facing store (tapas-store). Does NOT enable RLS —
-- that ships in a separate migration (20260411_ecommerce_rls.sql)
-- after the staff dashboard is validated against a Supabase branch.
--
-- Safe to run multiple times — every statement is guarded with
-- IF NOT EXISTS / OR REPLACE.
--
-- Run via Supabase SQL Editor or `supabase db push`.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. is_staff() helper
--     Used by every customer-facing RLS policy in Phase 2. Checks the
--     calling user's JWT email against the existing `staff` table.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.staff
        WHERE lower(email) = lower(auth.jwt() ->> 'email')
          AND is_active = true
    );
$$;

COMMENT ON FUNCTION public.is_staff() IS
    'Returns true if the JWT-authenticated user has an active row in the staff table. Used by RLS policies to grant staff full access.';

-- ---------------------------------------------------------------------
-- 2. members additions
--     auth_user_id links Supabase Auth users to member rows.
--     shipping_address is a placeholder for Phase 6 home-delivery.
-- ---------------------------------------------------------------------
ALTER TABLE public.members
    ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE
        REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.members
    ADD COLUMN IF NOT EXISTS shipping_address jsonb;

-- Backfill: link any walk-in members whose email matches an existing
-- auth user. Idempotent — only updates rows where auth_user_id is null.
UPDATE public.members m
SET auth_user_id = u.id
FROM auth.users u
WHERE lower(m.email) = lower(u.email)
  AND m.auth_user_id IS NULL
  AND m.email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_members_auth_user_id
    ON public.members (auth_user_id);

-- ---------------------------------------------------------------------
-- 3. books additions
--     store_visible   — admin toggle to expose a book on the store
--     is_borrowable   — excludes bookstore-only stock from the lending
--                       pool (defaults to true so existing books are
--                       unaffected)
--
--     We intentionally do NOT add is_for_sale or store_stock.
--     "Sellable" = sales_price > 0 AND store_visible = true
--     Stock is the single quantity_available field, decremented
--     atomically via reserve_book_copy() RPC.
-- ---------------------------------------------------------------------
ALTER TABLE public.books
    ADD COLUMN IF NOT EXISTS store_visible boolean NOT NULL DEFAULT false;

ALTER TABLE public.books
    ADD COLUMN IF NOT EXISTS is_borrowable boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_books_store_visible
    ON public.books (store_visible) WHERE store_visible = true;

-- ---------------------------------------------------------------------
-- 4. customer_orders — order headers for online purchases
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_orders (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number        bigint      GENERATED ALWAYS AS IDENTITY UNIQUE,
    member_id           uuid        NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,

    status              text        NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','paid','ready_for_pickup','fulfilled','cancelled','refunded')),

    subtotal            numeric(10,2) NOT NULL,
    discount            numeric(10,2) NOT NULL DEFAULT 0,
    total               numeric(10,2) NOT NULL,

    fulfillment_type    text        NOT NULL DEFAULT 'pickup'
        CHECK (fulfillment_type IN ('pickup','delivery')),
    shipping_address    jsonb,

    payment_method      text        NOT NULL DEFAULT 'razorpay',
    payment_status      text        NOT NULL DEFAULT 'pending',
    razorpay_order_id   text        UNIQUE,
    razorpay_payment_id text        UNIQUE,
    razorpay_signature  text,

    notes               text,
    reserved_until      timestamptz,

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_orders_member_id
    ON public.customer_orders (member_id);
CREATE INDEX IF NOT EXISTS idx_customer_orders_status
    ON public.customer_orders (status);
CREATE INDEX IF NOT EXISTS idx_customer_orders_created_at
    ON public.customer_orders (created_at DESC);

-- ---------------------------------------------------------------------
-- 5. customer_order_items — line items
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_order_items (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            uuid        NOT NULL REFERENCES public.customer_orders(id) ON DELETE CASCADE,

    item_type           text        NOT NULL
        CHECK (item_type IN ('book','membership')),

    book_id             uuid        REFERENCES public.books(id),     -- nullable for membership items
    membership_plan     text,                                         -- nullable for book items
    membership_days     int,                                          -- nullable for book items

    item_name           text        NOT NULL,
    unit_price          numeric(10,2) NOT NULL,
    quantity            int         NOT NULL CHECK (quantity > 0),
    total_price         numeric(10,2) NOT NULL,

    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_order_items_order_id
    ON public.customer_order_items (order_id);

-- ---------------------------------------------------------------------
-- 6. customer_order_status_history — audit trail
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_order_status_history (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    uuid        NOT NULL REFERENCES public.customer_orders(id) ON DELETE CASCADE,
    from_status text,
    to_status   text        NOT NULL,
    changed_by  uuid,                                          -- auth.uid() of the actor; nullable for system
    note        text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_order_status_history_order_id
    ON public.customer_order_status_history (order_id);

-- ---------------------------------------------------------------------
-- 7. reserve_book_copy / release_book_copy
--     Atomic stock decrement/increment. Used by the checkout edge
--     function. POS.js and Borrow.js keep their existing client-side
--     decrement paths for now — they'll switch in Phase 6.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reserve_book_copy(
    p_book_id uuid,
    p_qty     int
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_id uuid;
BEGIN
    IF p_qty <= 0 THEN
        RAISE EXCEPTION 'reserve_book_copy: qty must be positive (got %)', p_qty;
    END IF;

    UPDATE public.books
    SET    quantity_available = quantity_available - p_qty
    WHERE  id = p_book_id
      AND  quantity_available >= p_qty
    RETURNING id INTO v_id;

    -- Returns NULL if the row wasn't updated (sold out / race lost).
    RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.reserve_book_copy(uuid, int) IS
    'Atomically decrements books.quantity_available by p_qty. Returns the book id on success, NULL on failure (insufficient stock or race lost). Used by the checkout edge function.';

CREATE OR REPLACE FUNCTION public.release_book_copy(
    p_book_id uuid,
    p_qty     int
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_id uuid;
BEGIN
    IF p_qty <= 0 THEN
        RAISE EXCEPTION 'release_book_copy: qty must be positive (got %)', p_qty;
    END IF;

    UPDATE public.books
    SET    quantity_available = quantity_available + p_qty
    WHERE  id = p_book_id
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.release_book_copy(uuid, int) IS
    'Increments books.quantity_available by p_qty. Used by order cancellation and reservation expiry.';

-- ---------------------------------------------------------------------
-- 8. handle_new_customer_user
--     Trigger function that runs when a new row is inserted into
--     auth.users. Creates (or repairs) a matching members row and
--     links it via auth_user_id.
--
--     Idempotent — if a members row with this email already exists and
--     has no auth_user_id, we update it in place instead of creating a
--     duplicate. This handles the case where a walk-in member later
--     signs up online with the same email.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_customer_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_existing_id uuid;
BEGIN
    -- Try to find an existing members row by email that isn't linked yet.
    SELECT id INTO v_existing_id
    FROM public.members
    WHERE lower(email) = lower(NEW.email)
      AND auth_user_id IS NULL
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        -- Repair path: link the existing walk-in member.
        UPDATE public.members
        SET auth_user_id = NEW.id
        WHERE id = v_existing_id;
    ELSE
        -- Happy path: create a new online customer.
        INSERT INTO public.members (
            auth_user_id,
            email,
            name,
            customer_type,
            status
        ) VALUES (
            NEW.id,
            NEW.email,
            split_part(NEW.email, '@', 1),
            'online',
            'active'
        )
        ON CONFLICT (auth_user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_customer ON auth.users;
CREATE TRIGGER on_auth_user_created_customer
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_customer_user();

-- ---------------------------------------------------------------------
-- 9. customer_orders status history trigger
--     Writes a row to customer_order_status_history whenever status
--     changes. Also bumps updated_at.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_customer_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();

    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.customer_order_status_history (
            order_id,
            from_status,
            to_status,
            changed_by
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            auth.uid()
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customer_orders_status_change ON public.customer_orders;
CREATE TRIGGER customer_orders_status_change
    BEFORE UPDATE ON public.customer_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_customer_order_status_change();

-- ---------------------------------------------------------------------
-- 10. Grants
--     Everything runs through the anon key + RLS. Make sure the
--     anon and authenticated roles can execute the RPCs we expose.
-- ---------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.is_staff()                    TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.reserve_book_copy(uuid, int)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_book_copy(uuid, int)  TO authenticated;

-- =====================================================================
-- END 20260411_ecommerce.sql
-- =====================================================================
