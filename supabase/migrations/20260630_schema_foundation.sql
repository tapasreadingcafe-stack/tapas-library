-- ════════════════════════════════════════════════════════════════════════════
-- TAPAS LIBRARY — Schema Foundation + Bug Fixes
-- 2026-06-30
--
-- PART A: Documents all pre-existing tables as CREATE TABLE IF NOT EXISTS
--         so the full schema is reproducible from migrations alone.
--
-- PART B: Fixes 6 confirmed bugs from the June 2026 schema audit:
--   Bug 1 — handle_customer_order_status_change missing SECURITY DEFINER
--   Bug 2 — store_collection_items open to any authenticated user (CMS breach)
--   Bug 3 — store_promo_codes exposes inactive/expired codes to anon
--   Bug 4 — customer_orders has no non-negative constraints on money columns
--   Bug 5 — cafe_inventory has no non-negative constraints
--   Bug 6 — library_shelves.title_count / out_on_loan drift (no sync trigger)
--
-- Every statement uses IF NOT EXISTS — safe to run on a live database.
-- ════════════════════════════════════════════════════════════════════════════


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PART A — FOUNDATION TABLES
-- These existed before formal migration tracking began.
-- CREATE TABLE IF NOT EXISTS is a no-op when the table already exists.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ── A1. staff ─────────────────────────────────────────────────────────────
-- Gate for is_staff(): every write policy across the system checks this table.
CREATE TABLE IF NOT EXISTS public.staff (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL UNIQUE,
  name       text,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.staff IS
  'Staff accounts. is_staff() checks this table to authorise all write '
  'operations across the system. NULL is_active is treated as true (see is_staff() v2).';


-- ── A2. members ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.members (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text,
  email            text          UNIQUE,
  phone            text,
  status           text          NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active','expired','suspended','pending')),
  status_color     text,
  plan             text,
  customer_type    text,
  borrow_limit     int           NOT NULL DEFAULT 2,
  subscription_end timestamptz,
  fine_balance     numeric(10,2) NOT NULL DEFAULT 0 CHECK (fine_balance >= 0),
  date_of_birth    date,
  age              int,
  profile_photo    text,
  auth_user_id     uuid          UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  shipping_address jsonb,
  referred_by_code text,
  membership_tier  text          CHECK (membership_tier IN ('pass','monthly','annual')),
  payment_status   text          NOT NULL DEFAULT 'unpaid'
                                 CHECK (payment_status IN ('unpaid','paid','past_due','cancelled')),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.members IS
  'Library and store members. auth_user_id links to auth.users for the '
  'storefront login flow. borrow_limit is enforced per-plan in the Borrow page.';

COMMENT ON COLUMN public.members.auth_user_id IS
  'Links to auth.users.id. NULL for walk-in/staff-created members without a storefront account.';

COMMENT ON COLUMN public.members.borrow_limit IS
  'Max concurrent borrows. Default 2 (monthly). Higher tiers get more.';


-- ── A3. books ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.books (
  id                        uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id                   text          UNIQUE,
  title                     text          NOT NULL,
  author                    text,
  isbn                      text          UNIQUE,
  category                  text,
  condition                 text,
  mrp                       numeric(10,2) CHECK (mrp IS NULL OR mrp >= 0),
  price                     numeric(10,2) CHECK (price IS NULL OR price >= 0),
  sales_price               numeric(10,2) CHECK (sales_price IS NULL OR sales_price >= 0),
  quantity_available        int           NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  quantity_total            int           NOT NULL DEFAULT 0 CHECK (quantity_total >= 0),
  book_image                text,
  is_borrowable             boolean       NOT NULL DEFAULT true,
  store_visible             boolean       NOT NULL DEFAULT false,
  is_staff_pick             boolean       NOT NULL DEFAULT false,
  staff_pick_blurb          text,
  review_summary            text,
  review_summary_updated_at timestamptz,
  slug                      text          UNIQUE,
  cover_url                 text,
  cover_color               text,
  sort_order                int           NOT NULL DEFAULT 0,
  status                    text          NOT NULL DEFAULT 'published'
                                          CHECK (status IN ('draft','published')),
  shelf_id                  uuid          REFERENCES public.library_shelves(id) ON DELETE SET NULL,
  set_id                    uuid          REFERENCES public.book_sets(id) ON DELETE SET NULL,
  created_at                timestamptz   NOT NULL DEFAULT now(),
  updated_at                timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.books IS
  'Master inventory — serves both library (is_borrowable=true) and store (store_visible=true). '
  'book_id is the human-readable barcode: B-FIC-0001 (borrow) or S-CHI-0001 (sale).';

COMMENT ON COLUMN public.books.book_id IS
  'Human-readable barcode: [B|S]-[CATEGORY_PREFIX]-[0001]. Generated on insert.';

COMMENT ON COLUMN public.books.quantity_available IS
  'Auto-maintained by trg_sync_qty_on_copy_change. Do not update manually.';


-- ── A4. family_members ────────────────────────────────────────────────────
-- Must be created before circulation (circulation has a FK to it).
CREATE TABLE IF NOT EXISTS public.family_members (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_member_id uuid        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  date_of_birth    date,
  created_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.family_members IS
  'Child accounts linked to a parent member. parent_member_id = parent. '
  'Used for family membership borrow tracking in circulation.';


-- ── A5. book_copies ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.book_copies (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id             uuid          NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  copy_code           text          NOT NULL UNIQUE,
  status              text          NOT NULL DEFAULT 'available'
                                    CHECK (status IN ('available','issued','sold','lost','damaged')),
  current_borrower_id uuid          REFERENCES public.members(id) ON DELETE SET NULL,
  sold_price          numeric(10,2) CHECK (sold_price IS NULL OR sold_price >= 0),
  sold_date           date,
  condition           text,
  copy_kind           text          NOT NULL DEFAULT 'library'
                                    CHECK (copy_kind IN ('library','sale')),
  copy_mrp            numeric(10,2) CHECK (copy_mrp IS NULL OR copy_mrp >= 0),
  copy_price          numeric(10,2) CHECK (copy_price IS NULL OR copy_price >= 0),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.book_copies IS
  'Individual physical copies. Each copy has a unique barcode (copy_code). '
  'status drives books.quantity_available via trg_sync_qty_on_copy_change.';

COMMENT ON COLUMN public.book_copies.copy_code IS
  'Barcode printed on the book. Format: B-FIC-0001 or S-FIC-0001.';

COMMENT ON COLUMN public.book_copies.copy_mrp IS
  'Per-copy MRP override. NULL = inherit from books.mrp.';

COMMENT ON COLUMN public.book_copies.copy_price IS
  'Per-copy selling price override. NULL = inherit from books.sales_price.';


-- ── A6. circulation ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.circulation (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id        uuid          NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  book_id          uuid          NOT NULL REFERENCES public.books(id) ON DELETE RESTRICT,
  checkout_copy_id uuid          REFERENCES public.book_copies(id) ON DELETE SET NULL,
  child_id         uuid          REFERENCES public.family_members(id) ON DELETE SET NULL,
  status           text          NOT NULL DEFAULT 'checked_out'
                                 CHECK (status IN ('checked_out','returned')),
  due_date         date,
  return_date      date,
  fine_amount      numeric(10,2) NOT NULL DEFAULT 0 CHECK (fine_amount >= 0),
  fine_paid        boolean       NOT NULL DEFAULT false,
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.circulation IS
  'One row per borrow event. checkout_copy_id links to book_copies; '
  'fine_paid tracks whether any overdue fee was collected.';

COMMENT ON COLUMN public.circulation.fine_paid IS
  'Set to true when the overdue fine for this borrow is collected (via POS or manually).';


-- ── A7. events ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text        UNIQUE,
  title        text        NOT NULL,
  italic_accent text,
  description  text,
  category     text,
  badge        text,
  start_date   date,
  start_time   time,
  capacity     int         CHECK (capacity IS NULL OR capacity > 0),
  cta_type     text,
  chip_color   text,
  image_url    text,
  cover_url    text,
  sort_order   int         NOT NULL DEFAULT 0,
  status       text        NOT NULL DEFAULT 'published'
                           CHECK (status IN ('draft','published')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.events IS
  'Public events. image_url is the legacy column; cover_url is the CMS-managed one. '
  'Prefer cover_url when non-null.';


-- ── A8. reservations ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reservations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  uuid        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  book_id    uuid        NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  status     text        NOT NULL DEFAULT 'registered'
                         CHECK (status IN ('registered','pending','available','fulfilled','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.reservations IS
  'A member reserves a title before it comes back. '
  'Status flow: registered → pending → available → fulfilled/cancelled.';


-- ── A9. pos_transactions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pos_transactions (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id      uuid          REFERENCES public.members(id) ON DELETE SET NULL,
  total_amount   numeric(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  payment_method text,
  notes          text,
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pos_transactions IS
  'Walk-in POS sales. Line items live in pos_transaction_items.';


-- ── A10. pos_transaction_items ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pos_transaction_items (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid          NOT NULL REFERENCES public.pos_transactions(id) ON DELETE CASCADE,
  book_id        uuid          REFERENCES public.books(id) ON DELETE SET NULL,
  fine_id        uuid          REFERENCES public.circulation(id) ON DELETE SET NULL,
  item_type      text          NOT NULL
                               CHECK (item_type IN ('book','fine','service','membership')),
  item_name      text          NOT NULL,
  quantity       int           NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price     numeric(10,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  total_price    numeric(10,2) NOT NULL DEFAULT 0 CHECK (total_price >= 0),
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.pos_transaction_items IS
  'Line items for a POS transaction. item_type: book, fine, service, or membership.';


-- ── A11. app_settings ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_settings (
  key        text        PRIMARY KEY,
  value      text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.app_settings IS
  'Key-value store for runtime config. Keys: whatsapp_mode, whatsapp_api_key, '
  'fine_per_day, borrow_days, etc.';


-- ── A12. wishlists ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wishlists (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  uuid        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  book_id    uuid        NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, book_id)
);

COMMENT ON TABLE public.wishlists IS 'Books saved to a member''s wishlist on the storefront.';


-- ── A13. reviews ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  uuid        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  book_id    uuid        NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  rating     int         CHECK (rating BETWEEN 1 AND 5),
  body       text,
  status     text        NOT NULL DEFAULT 'published'
                         CHECK (status IN ('draft','published','flagged')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, book_id)
);

COMMENT ON TABLE public.reviews IS 'Member book reviews. One review per member per book.';


-- ── A14. promo_codes (staff-facing walk-in codes) ─────────────────────────
-- NOT the same as store_promo_codes (online storefront, 20260416_phase9.sql).
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text          NOT NULL UNIQUE,
  discount_value numeric(10,2) NOT NULL CHECK (discount_value > 0),
  discount_type  text          NOT NULL DEFAULT 'flat'
                               CHECK (discount_type IN ('percent','flat')),
  is_active      boolean       NOT NULL DEFAULT true,
  used_count     int           NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  created_at     timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.promo_codes IS
  'Walk-in / staff-applied promo codes managed in MarketingHub. '
  'The online storefront uses store_promo_codes (20260416_phase9.sql) instead.';


-- ── A15. promo_code_uses ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promo_code_uses (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id         uuid          NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  member_id        uuid          REFERENCES public.members(id) ON DELETE SET NULL,
  discount_applied numeric(10,2) NOT NULL CHECK (discount_applied >= 0),
  used_at          timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.promo_code_uses IS 'Redemption log for walk-in promo_codes.';


-- ── A16. birthday_offers ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.birthday_offers (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  year          int         NOT NULL,
  promo_code_id uuid        REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.birthday_offers IS 'Annual birthday promo codes sent to members.';


-- ── A17. sales (legacy) ───────────────────────────────────────────────────
-- Newer sales go through pos_transactions. Kept for historical reporting.
CREATE TABLE IF NOT EXISTS public.sales (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id    uuid          REFERENCES public.members(id) ON DELETE SET NULL,
  book_id      uuid          REFERENCES public.books(id) ON DELETE SET NULL,
  quantity     int           NOT NULL DEFAULT 1 CHECK (quantity > 0),
  total_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  sale_date    date          NOT NULL DEFAULT CURRENT_DATE,
  status       text          NOT NULL DEFAULT 'completed',
  created_at   timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.sales IS
  'Legacy sales table (pre-POS). New sales go through pos_transactions. '
  'Retained for historical reporting.';


-- ── A18. transactions (legacy) ────────────────────────────────────────────
-- General-purpose payment/fine log referenced by Reports, Accounts, etc.
CREATE TABLE IF NOT EXISTS public.transactions (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id        uuid          REFERENCES public.members(id) ON DELETE SET NULL,
  transaction_type text,
  item_name        text,
  item_type        text,
  quantity         int,
  amount           numeric(10,2),
  payment_method   text,
  transaction_date date          NOT NULL DEFAULT CURRENT_DATE,
  status           text          NOT NULL DEFAULT 'completed',
  created_at       timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.transactions IS
  'Legacy general-purpose payment/fine log. New POS activity goes through '
  'pos_transactions + pos_transaction_items.';


-- ── Indexes for newly documented tables ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sales_member_id       ON public.sales(member_id);
CREATE INDEX IF NOT EXISTS idx_sales_book_id         ON public.sales(book_id);
CREATE INDEX IF NOT EXISTS idx_transactions_member_id ON public.transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_promo_uses_promo_id   ON public.promo_code_uses(promo_id);
CREATE INDEX IF NOT EXISTS idx_promo_uses_member_id  ON public.promo_code_uses(member_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_member_id   ON public.wishlists(member_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_book_id     ON public.wishlists(book_id);
CREATE INDEX IF NOT EXISTS idx_reviews_book_id       ON public.reviews(book_id);
CREATE INDEX IF NOT EXISTS idx_reviews_member_id     ON public.reviews(member_id);
CREATE INDEX IF NOT EXISTS idx_circulation_status    ON public.circulation(status);
CREATE INDEX IF NOT EXISTS idx_book_copies_status    ON public.book_copies(status);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PART B — BUG FIXES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ── Bug 1: handle_customer_order_status_change missing SECURITY DEFINER ──
-- Without it, the trigger ran as the calling user's role. If a customer
-- triggered a status change (e.g. payment callback), the INSERT into
-- customer_order_status_history would be blocked by RLS — the audit row
-- was silently lost.
CREATE OR REPLACE FUNCTION public.handle_customer_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.customer_order_status_history
      (order_id, from_status, to_status, changed_by)
    VALUES
      (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;


-- ── Bug 2: store_collection_items RLS allowed any logged-in customer to ──
-- insert, update, and delete CMS content. Restrict writes to staff only.
ALTER TABLE public.store_collection_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS store_collection_items_select ON public.store_collection_items;
DROP POLICY IF EXISTS store_collection_items_insert ON public.store_collection_items;
DROP POLICY IF EXISTS store_collection_items_update ON public.store_collection_items;
DROP POLICY IF EXISTS store_collection_items_delete ON public.store_collection_items;
DROP POLICY IF EXISTS store_collection_items_all    ON public.store_collection_items;

CREATE POLICY store_coll_items_read
  ON public.store_collection_items FOR SELECT
  USING (status = 'published' OR public.is_staff());

CREATE POLICY store_coll_items_write
  ON public.store_collection_items FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());


-- ── Bug 3: store_promo_codes exposed ALL codes (including inactive and ────
-- expired) to anonymous users. Anyone could enumerate every promo code.
ALTER TABLE public.store_promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS store_promo_codes_select ON public.store_promo_codes;
DROP POLICY IF EXISTS store_promo_codes_all    ON public.store_promo_codes;

CREATE POLICY store_promo_codes_public_read
  ON public.store_promo_codes FOR SELECT
  USING (
    public.is_staff()
    OR (
      is_active = true
      AND (starts_at IS NULL OR starts_at <= now())
      AND (expires_at IS NULL OR expires_at > now())
    )
  );

CREATE POLICY store_promo_codes_staff_write
  ON public.store_promo_codes FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());


-- ── Bug 4: customer_orders money columns had no non-negative constraints ─
-- (PostgreSQL does not support ADD CONSTRAINT IF NOT EXISTS — use DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'customer_orders' AND constraint_name = 'chk_orders_subtotal_non_negative'
  ) THEN
    ALTER TABLE public.customer_orders ADD CONSTRAINT chk_orders_subtotal_non_negative CHECK (subtotal >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'customer_orders' AND constraint_name = 'chk_orders_discount_non_negative'
  ) THEN
    ALTER TABLE public.customer_orders ADD CONSTRAINT chk_orders_discount_non_negative CHECK (discount >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'customer_orders' AND constraint_name = 'chk_orders_total_non_negative'
  ) THEN
    ALTER TABLE public.customer_orders ADD CONSTRAINT chk_orders_total_non_negative CHECK (total >= 0);
  END IF;
END $$;


-- ── Bug 5: cafe_inventory had no non-negative constraints ────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'cafe_inventory' AND constraint_name = 'chk_cafe_cost_non_negative'
  ) THEN
    ALTER TABLE public.cafe_inventory ADD CONSTRAINT chk_cafe_cost_non_negative CHECK (cost_per_unit IS NULL OR cost_per_unit >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'cafe_inventory' AND constraint_name = 'chk_cafe_stock_non_negative'
  ) THEN
    ALTER TABLE public.cafe_inventory ADD CONSTRAINT chk_cafe_stock_non_negative CHECK (current_stock >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'cafe_inventory' AND constraint_name = 'chk_cafe_min_stock_non_negative'
  ) THEN
    ALTER TABLE public.cafe_inventory ADD CONSTRAINT chk_cafe_min_stock_non_negative CHECK (min_stock_level >= 0);
  END IF;
END $$;


-- ── Bug 6: library_shelves.title_count and out_on_loan drift over time ───
-- No trigger kept them in sync with books/book_copies — they required
-- manual updates after every status change. This trigger recalculates
-- both counts automatically whenever a book changes shelf or a copy
-- changes status.

CREATE OR REPLACE FUNCTION public.sync_shelf_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_shelf uuid;
  old_shelf    uuid;
BEGIN
  IF TG_TABLE_NAME = 'books' THEN
    target_shelf := COALESCE(NEW.shelf_id, OLD.shelf_id);
    old_shelf    := OLD.shelf_id;
  ELSE
    -- book_copies: look up the shelf through the book
    SELECT shelf_id INTO target_shelf
    FROM   public.books
    WHERE  id = COALESCE(NEW.book_id, OLD.book_id);
    old_shelf := NULL;
  END IF;

  IF target_shelf IS NOT NULL THEN
    UPDATE public.library_shelves
    SET
      title_count = (
        SELECT COUNT(DISTINCT b.id)
        FROM   public.books b
        WHERE  b.shelf_id = target_shelf
      ),
      out_on_loan = (
        SELECT COUNT(*)
        FROM   public.book_copies bc
        JOIN   public.books b ON b.id = bc.book_id
        WHERE  b.shelf_id = target_shelf
        AND    bc.status  = 'issued'
      )
    WHERE id = target_shelf;
  END IF;

  -- When a book moves between shelves, update the old shelf too
  IF old_shelf IS DISTINCT FROM target_shelf AND old_shelf IS NOT NULL THEN
    UPDATE public.library_shelves
    SET
      title_count = (
        SELECT COUNT(DISTINCT b.id)
        FROM   public.books b
        WHERE  b.shelf_id = old_shelf
      ),
      out_on_loan = (
        SELECT COUNT(*)
        FROM   public.book_copies bc
        JOIN   public.books b ON b.id = bc.book_id
        WHERE  b.shelf_id = old_shelf
        AND    bc.status  = 'issued'
      )
    WHERE id = old_shelf;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_shelf_on_book_change ON public.books;
DROP TRIGGER IF EXISTS trg_sync_shelf_on_copy_change ON public.book_copies;

CREATE TRIGGER trg_sync_shelf_on_book_change
AFTER INSERT OR UPDATE OF shelf_id OR DELETE
ON public.books
FOR EACH ROW
EXECUTE FUNCTION public.sync_shelf_counts();

CREATE TRIGGER trg_sync_shelf_on_copy_change
AFTER INSERT OR UPDATE OF status OR DELETE
ON public.book_copies
FOR EACH ROW
EXECUTE FUNCTION public.sync_shelf_counts();

COMMENT ON FUNCTION public.sync_shelf_counts() IS
  'Keeps library_shelves.title_count and out_on_loan accurate. '
  'Fires after every book shelf assignment change and every book_copies status change.';
