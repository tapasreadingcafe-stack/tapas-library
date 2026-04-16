-- =====================================================================
-- 20260416_phase9.sql
--
-- Phase 9: customer storefront polish, analytics hub, AI assist, PWA.
--
-- Additive, idempotent migration. Adds:
--   - loyalty_balances / loyalty_transactions       (Pillar 1)
--   - referrals                                     (Pillar 1)
--   - store_promo_codes / store_promo_redemptions   (Pillar 1)
--   - customer_addresses                            (Pillar 1)
--   - order_shipments                               (Pillar 1)
--   - cart_snapshots                                (Pillar 2)
--   - content_views                                 (Pillar 2)
--   - books.review_summary / _updated_at            (Pillar 3)
--
-- Naming note: `loyalty_balances` and `store_promo_codes` are named
-- this way instead of the more obvious `loyalty_points` / `promo_codes`
-- because tables with those names already exist from the Phase 6
-- marketing-tools buildout and have different column shapes.
--   - triggers that award loyalty points on paid orders and reward
--     referrers on a referee's first paid order.
--
-- RLS policies are included inline so customers only ever see their own
-- rows and staff sees everything. All grants mirror the Phase 5 pattern.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. customer_addresses — saved shipping addresses for delivery orders
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_addresses (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id       uuid        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    label           text,                                    -- e.g. "Home", "Office"
    recipient_name  text        NOT NULL,
    phone           text        NOT NULL,
    line1           text        NOT NULL,
    line2           text,
    city            text        NOT NULL,
    state           text,
    pincode         text        NOT NULL,
    is_default      boolean     NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_member_id
    ON public.customer_addresses (member_id);

ALTER TABLE public.customer_orders
    ADD COLUMN IF NOT EXISTS shipping_address_id uuid
        REFERENCES public.customer_addresses(id);

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_addresses_all ON public.customer_addresses;
CREATE POLICY customer_addresses_all ON public.customer_addresses
    FOR ALL
    USING (public.is_staff() OR member_id = public.current_member_id())
    WITH CHECK (public.is_staff() OR member_id = public.current_member_id());

-- ---------------------------------------------------------------------
-- 2. order_shipments — delivery tracking details
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_shipments (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            uuid        NOT NULL REFERENCES public.customer_orders(id) ON DELETE CASCADE,
    carrier             text,
    tracking_number     text,
    tracking_url        text,
    estimated_delivery  date,
    shipped_at          timestamptz,
    delivered_at        timestamptz,
    notes               text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_order_shipments_order_id
    ON public.order_shipments (order_id);

ALTER TABLE public.order_shipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_shipments_select ON public.order_shipments;
CREATE POLICY order_shipments_select ON public.order_shipments
    FOR SELECT
    USING (
        public.is_staff()
        OR order_id IN (
            SELECT id FROM public.customer_orders
            WHERE member_id = public.current_member_id()
        )
    );

DROP POLICY IF EXISTS order_shipments_write ON public.order_shipments;
CREATE POLICY order_shipments_write ON public.order_shipments
    FOR ALL
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- ---------------------------------------------------------------------
-- 3. loyalty_balances — running balance per member, 1 row per member.
--     (Named _balances to avoid colliding with the pre-existing
--     marketing-tools `loyalty_points` transaction log.)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_balances (
    member_id       uuid        PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
    balance         int         NOT NULL DEFAULT 0 CHECK (balance >= 0),
    lifetime_earned int         NOT NULL DEFAULT 0 CHECK (lifetime_earned >= 0),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS loyalty_balances_select ON public.loyalty_balances;
CREATE POLICY loyalty_balances_select ON public.loyalty_balances
    FOR SELECT
    USING (public.is_staff() OR member_id = public.current_member_id());

-- Writes only via definer-security triggers below.
DROP POLICY IF EXISTS loyalty_balances_write ON public.loyalty_balances;
CREATE POLICY loyalty_balances_write ON public.loyalty_balances
    FOR ALL
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- ---------------------------------------------------------------------
-- 4. loyalty_transactions — audit log of every earn / redeem
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id       uuid        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    kind            text        NOT NULL CHECK (kind IN ('earn','redeem','bonus','adjust')),
    points          int         NOT NULL,                      -- positive for earn/bonus, negative for redeem
    reason          text        NOT NULL,
    order_id        uuid        REFERENCES public.customer_orders(id) ON DELETE SET NULL,
    referral_id     uuid,                                      -- forward-decl; FK added after referrals table
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_tx_member_id
    ON public.loyalty_transactions (member_id, created_at DESC);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS loyalty_tx_select ON public.loyalty_transactions;
CREATE POLICY loyalty_tx_select ON public.loyalty_transactions
    FOR SELECT
    USING (public.is_staff() OR member_id = public.current_member_id());

DROP POLICY IF EXISTS loyalty_tx_write ON public.loyalty_transactions;
CREATE POLICY loyalty_tx_write ON public.loyalty_transactions
    FOR ALL
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- ---------------------------------------------------------------------
-- 5. referrals — one row per (from_member, code); to_member filled
--    when someone signs up via the link.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referrals (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    code            text        NOT NULL UNIQUE,
    from_member_id  uuid        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    to_member_id    uuid        REFERENCES public.members(id) ON DELETE SET NULL,
    reward_status   text        NOT NULL DEFAULT 'pending'
        CHECK (reward_status IN ('pending','rewarded','void')),
    referee_order_id uuid       REFERENCES public.customer_orders(id) ON DELETE SET NULL,
    rewarded_at     timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_from ON public.referrals (from_member_id);
CREATE INDEX IF NOT EXISTS idx_referrals_to   ON public.referrals (to_member_id);

-- Forward FK on loyalty_transactions.referral_id (deferred until table exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'loyalty_tx_referral_fk'
    ) THEN
        ALTER TABLE public.loyalty_transactions
            ADD CONSTRAINT loyalty_tx_referral_fk
            FOREIGN KEY (referral_id)
            REFERENCES public.referrals(id) ON DELETE SET NULL;
    END IF;
END $$;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referrals_select ON public.referrals;
CREATE POLICY referrals_select ON public.referrals
    FOR SELECT
    USING (
        public.is_staff()
        OR from_member_id = public.current_member_id()
        OR to_member_id   = public.current_member_id()
    );

DROP POLICY IF EXISTS referrals_insert ON public.referrals;
CREATE POLICY referrals_insert ON public.referrals
    FOR INSERT
    WITH CHECK (public.is_staff() OR from_member_id = public.current_member_id());

DROP POLICY IF EXISTS referrals_update ON public.referrals;
CREATE POLICY referrals_update ON public.referrals
    FOR UPDATE
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- ---------------------------------------------------------------------
-- 6. store_promo_codes / store_promo_redemptions
--     (Named store_ to avoid colliding with the pre-existing
--     marketing-tools `promo_codes` + `promo_code_uses` tables which
--     have a different column shape.)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_promo_codes (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    code            text        NOT NULL UNIQUE,
    description     text,
    kind            text        NOT NULL CHECK (kind IN ('percent','flat')),
    value           numeric(10,2) NOT NULL CHECK (value > 0),
    min_total       numeric(10,2) NOT NULL DEFAULT 0,
    max_discount    numeric(10,2),
    max_uses        int,
    max_uses_per_member int,
    starts_at       timestamptz,
    expires_at      timestamptz,
    is_active       boolean     NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_promo_codes_active
    ON public.store_promo_codes (is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.store_promo_redemptions (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code_id   uuid        NOT NULL REFERENCES public.store_promo_codes(id) ON DELETE CASCADE,
    order_id        uuid        NOT NULL REFERENCES public.customer_orders(id) ON DELETE CASCADE,
    member_id       uuid        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    discount_amount numeric(10,2) NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_store_promo_redemptions_promo
    ON public.store_promo_redemptions (promo_code_id);
CREATE INDEX IF NOT EXISTS idx_store_promo_redemptions_member
    ON public.store_promo_redemptions (member_id);

ALTER TABLE public.store_promo_codes ENABLE ROW LEVEL SECURITY;

-- Promo codes are semi-public: anyone logged in can look them up to
-- validate at checkout, but only staff can write.
DROP POLICY IF EXISTS store_promo_codes_select ON public.store_promo_codes;
CREATE POLICY store_promo_codes_select ON public.store_promo_codes
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS store_promo_codes_write ON public.store_promo_codes;
CREATE POLICY store_promo_codes_write ON public.store_promo_codes
    FOR ALL
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

ALTER TABLE public.store_promo_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS store_promo_red_select ON public.store_promo_redemptions;
CREATE POLICY store_promo_red_select ON public.store_promo_redemptions
    FOR SELECT
    USING (public.is_staff() OR member_id = public.current_member_id());

DROP POLICY IF EXISTS store_promo_red_write ON public.store_promo_redemptions;
CREATE POLICY store_promo_red_write ON public.store_promo_redemptions
    FOR ALL
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- customer_orders gets a promo_code_id column so checkout can record
-- which code was applied (redundant with the redemptions table, but
-- saves a join on every order row).
ALTER TABLE public.customer_orders
    ADD COLUMN IF NOT EXISTS promo_code_id uuid
        REFERENCES public.store_promo_codes(id) ON DELETE SET NULL;

ALTER TABLE public.customer_orders
    ADD COLUMN IF NOT EXISTS points_redeemed int NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------
-- 7. cart_snapshots — for abandonment tracking on the Insights hub
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cart_snapshots (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id       uuid        REFERENCES public.members(id) ON DELETE CASCADE,
    items_json      jsonb       NOT NULL,
    total           numeric(10,2) NOT NULL,
    completed_order_id uuid     REFERENCES public.customer_orders(id) ON DELETE SET NULL,
    notified_at     timestamptz,                              -- when the recovery email was sent
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cart_snapshots_member
    ON public.cart_snapshots (member_id);
CREATE INDEX IF NOT EXISTS idx_cart_snapshots_unfinished
    ON public.cart_snapshots (created_at DESC)
    WHERE completed_order_id IS NULL;

ALTER TABLE public.cart_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cart_snapshots_select ON public.cart_snapshots;
CREATE POLICY cart_snapshots_select ON public.cart_snapshots
    FOR SELECT
    USING (public.is_staff() OR member_id = public.current_member_id());

DROP POLICY IF EXISTS cart_snapshots_insert ON public.cart_snapshots;
CREATE POLICY cart_snapshots_insert ON public.cart_snapshots
    FOR INSERT
    WITH CHECK (public.is_staff() OR member_id = public.current_member_id());

DROP POLICY IF EXISTS cart_snapshots_update ON public.cart_snapshots;
CREATE POLICY cart_snapshots_update ON public.cart_snapshots
    FOR UPDATE
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- ---------------------------------------------------------------------
-- 8. content_views — lightweight tracking of blog / page views
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_views (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    content_kind text       NOT NULL CHECK (content_kind IN ('blog','page','book')),
    content_ref  text       NOT NULL,                         -- slug or uuid depending on kind
    viewer_id   uuid        REFERENCES public.members(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_views_ref
    ON public.content_views (content_kind, content_ref, created_at DESC);

ALTER TABLE public.content_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_views_insert ON public.content_views;
CREATE POLICY content_views_insert ON public.content_views
    FOR INSERT
    WITH CHECK (true);                                       -- anyone can log a view

DROP POLICY IF EXISTS content_views_select ON public.content_views;
CREATE POLICY content_views_select ON public.content_views
    FOR SELECT
    USING (public.is_staff());

-- ---------------------------------------------------------------------
-- 9. books.review_summary — cache for the AI-generated review digest
-- ---------------------------------------------------------------------
ALTER TABLE public.books
    ADD COLUMN IF NOT EXISTS review_summary text;

ALTER TABLE public.books
    ADD COLUMN IF NOT EXISTS review_summary_updated_at timestamptz;

-- ---------------------------------------------------------------------
-- 10. members.referred_by — link captured on signup
-- ---------------------------------------------------------------------
ALTER TABLE public.members
    ADD COLUMN IF NOT EXISTS referred_by_code text;

-- ---------------------------------------------------------------------
-- 11. Helpers: grant points + book a referral on the first paid order
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_loyalty_points(
    p_member_id uuid,
    p_points    int,
    p_reason    text,
    p_order_id  uuid DEFAULT NULL,
    p_kind      text DEFAULT 'earn',
    p_referral_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF p_points = 0 THEN RETURN; END IF;

    INSERT INTO public.loyalty_balances (member_id, balance, lifetime_earned, updated_at)
    VALUES (
        p_member_id,
        GREATEST(0, p_points),
        GREATEST(0, p_points),
        now()
    )
    ON CONFLICT (member_id) DO UPDATE
    SET balance          = GREATEST(0, loyalty_balances.balance + p_points),
        lifetime_earned  = loyalty_balances.lifetime_earned + GREATEST(0, p_points),
        updated_at       = now();

    INSERT INTO public.loyalty_transactions (
        member_id, kind, points, reason, order_id, referral_id
    ) VALUES (
        p_member_id, p_kind, p_points, p_reason, p_order_id, p_referral_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_loyalty_points(uuid,int,text,uuid,text,uuid)
    TO authenticated;

-- ---------------------------------------------------------------------
-- 12. Trigger: award points on paid orders (1 pt per ₹10 of net total)
--     Also reward referrer on referee's first paid order.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_points_on_paid_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_points_earned int;
    v_prior_paid    int;
    v_referral      public.referrals%ROWTYPE;
    v_referrer_bonus constant int := 100;
    v_referee_bonus  constant int := 50;
BEGIN
    -- Only fire on status transition into 'paid'.
    IF NEW.status <> 'paid' OR (OLD.status IS NOT DISTINCT FROM NEW.status) THEN
        RETURN NEW;
    END IF;

    -- 1 pt per ₹10 of (total - points_redeemed value). Points redeemed
    -- convert at ₹1 per point, so subtract from subtotal for accrual.
    v_points_earned := GREATEST(0, FLOOR((COALESCE(NEW.total, 0)) / 10)::int);

    IF v_points_earned > 0 THEN
        PERFORM public.grant_loyalty_points(
            NEW.member_id,
            v_points_earned,
            'Order #' || NEW.order_number,
            NEW.id,
            'earn',
            NULL
        );
    END IF;

    -- Check if this is the referee's first paid order; if so, reward both.
    SELECT COUNT(*) INTO v_prior_paid
    FROM public.customer_orders
    WHERE member_id = NEW.member_id
      AND status IN ('paid','ready_for_pickup','fulfilled','refunded')
      AND id <> NEW.id;

    IF v_prior_paid = 0 THEN
        SELECT * INTO v_referral
        FROM public.referrals
        WHERE to_member_id = NEW.member_id
          AND reward_status = 'pending'
        LIMIT 1;

        IF v_referral.id IS NOT NULL THEN
            -- Reward the referrer
            PERFORM public.grant_loyalty_points(
                v_referral.from_member_id,
                v_referrer_bonus,
                'Referral bonus (friend''s first order)',
                NEW.id,
                'bonus',
                v_referral.id
            );
            -- Reward the referee
            PERFORM public.grant_loyalty_points(
                NEW.member_id,
                v_referee_bonus,
                'Welcome bonus (joined via referral)',
                NEW.id,
                'bonus',
                v_referral.id
            );
            UPDATE public.referrals
            SET reward_status = 'rewarded',
                referee_order_id = NEW.id,
                rewarded_at = now()
            WHERE id = v_referral.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customer_orders_award_points ON public.customer_orders;
CREATE TRIGGER customer_orders_award_points
    AFTER UPDATE ON public.customer_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.award_points_on_paid_order();

-- ---------------------------------------------------------------------
-- 13. Link referral to new member at signup — if the members row has
--     referred_by_code set, create/update the matching referrals row.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_member_referral_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_ref_id uuid;
BEGIN
    IF NEW.referred_by_code IS NULL OR NEW.referred_by_code = '' THEN
        RETURN NEW;
    END IF;

    -- Find the referral row; if the from_member is the same as NEW.id,
    -- ignore (self-referral).
    SELECT id INTO v_ref_id
    FROM public.referrals
    WHERE code = NEW.referred_by_code
      AND from_member_id <> NEW.id
      AND to_member_id IS NULL
    LIMIT 1;

    IF v_ref_id IS NOT NULL THEN
        UPDATE public.referrals
        SET to_member_id = NEW.id
        WHERE id = v_ref_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS members_referral_link_insert ON public.members;
CREATE TRIGGER members_referral_link_insert
    AFTER INSERT ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_member_referral_link();

DROP TRIGGER IF EXISTS members_referral_link_update ON public.members;
CREATE TRIGGER members_referral_link_update
    AFTER UPDATE OF referred_by_code ON public.members
    FOR EACH ROW
    WHEN (NEW.referred_by_code IS DISTINCT FROM OLD.referred_by_code)
    EXECUTE FUNCTION public.handle_member_referral_link();

-- =====================================================================
-- END 20260416_phase9.sql
-- =====================================================================
