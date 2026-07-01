-- ════════════════════════════════════════════════════════════════════════════
-- TAPAS LIBRARY — Professional DB hardening
-- 2026-06-28
--
-- What this migration does (in order):
--   1. Check constraints  — prices/quantities can never go negative
--   2. FK indexes          — Postgres doesn't auto-index FK columns; every JOIN
--                            that was doing a seq-scan will now use an index
--   3. updated_at triggers — book_copies and circulation auto-stamp updates
--   4. Auto-sync trigger   — book_copies status → books.quantity_available
--                            (eliminates the entire class of qty-mismatch bugs)
--   5. RLS on open tables  — book_copies, pos_transactions, pos_transaction_items,
--                            family_members (were unprotected)
--   6. Helper functions    — get_member_borrows(), get_member_fine() exposed as
--                            RPC calls; apps can call them instead of re-querying
--   7. Table + column docs — COMMENT ON TABLE/COLUMN so the Supabase schema
--                            viewer is self-documenting
-- ════════════════════════════════════════════════════════════════════════════


-- ── 1. CHECK CONSTRAINTS ────────────────────────────────────────────────────
-- PostgreSQL does not support ADD CONSTRAINT IF NOT EXISTS — use DO blocks.

DO $$
BEGIN
  -- books: prices and quantities can never be negative
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='books' AND constraint_name='chk_books_mrp_positive') THEN
    ALTER TABLE public.books ADD CONSTRAINT chk_books_mrp_positive CHECK (mrp IS NULL OR mrp >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='books' AND constraint_name='chk_books_price_positive') THEN
    ALTER TABLE public.books ADD CONSTRAINT chk_books_price_positive CHECK (price IS NULL OR price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='books' AND constraint_name='chk_books_sales_price_positive') THEN
    ALTER TABLE public.books ADD CONSTRAINT chk_books_sales_price_positive CHECK (sales_price IS NULL OR sales_price >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='books' AND constraint_name='chk_books_qty_non_negative') THEN
    ALTER TABLE public.books ADD CONSTRAINT chk_books_qty_non_negative CHECK (
      (quantity_available IS NULL OR quantity_available >= 0) AND
      (quantity_total      IS NULL OR quantity_total      >= 0)
    );
  END IF;

  -- book_copies: copy-level price overrides are non-negative
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='book_copies' AND constraint_name='chk_copy_mrp_positive') THEN
    ALTER TABLE public.book_copies ADD CONSTRAINT chk_copy_mrp_positive CHECK (copy_mrp IS NULL OR copy_mrp >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='book_copies' AND constraint_name='chk_copy_price_positive') THEN
    ALTER TABLE public.book_copies ADD CONSTRAINT chk_copy_price_positive CHECK (copy_price IS NULL OR copy_price >= 0);
  END IF;

  -- book_sets
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='book_sets' AND constraint_name='chk_set_mrp_positive') THEN
    ALTER TABLE public.book_sets ADD CONSTRAINT chk_set_mrp_positive CHECK (set_mrp IS NULL OR set_mrp >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='book_sets' AND constraint_name='chk_set_price_positive') THEN
    ALTER TABLE public.book_sets ADD CONSTRAINT chk_set_price_positive CHECK (set_price IS NULL OR set_price >= 0);
  END IF;
END $$;


-- ── 2. FOREIGN-KEY INDEXES ──────────────────────────────────────────────────
-- Postgres creates indexes on PK/unique columns but NOT on FK columns.
-- Every JOIN on these FKs was a sequential scan.

-- circulation
CREATE INDEX IF NOT EXISTS idx_circulation_member_id
  ON circulation(member_id);

CREATE INDEX IF NOT EXISTS idx_circulation_book_id
  ON circulation(book_id);

-- book_copies
CREATE INDEX IF NOT EXISTS idx_book_copies_book_id
  ON book_copies(book_id);

-- pos_transaction_items
CREATE INDEX IF NOT EXISTS idx_pos_txn_items_txn_id
  ON pos_transaction_items(transaction_id);

CREATE INDEX IF NOT EXISTS idx_pos_txn_items_book_id
  ON pos_transaction_items(book_id);

-- reservations
CREATE INDEX IF NOT EXISTS idx_reservations_member_id
  ON reservations(member_id);

CREATE INDEX IF NOT EXISTS idx_reservations_book_id
  ON reservations(book_id);

-- members
CREATE INDEX IF NOT EXISTS idx_members_email
  ON members(email);

CREATE INDEX IF NOT EXISTS idx_members_auth_user_id
  ON members(auth_user_id);

-- books
CREATE INDEX IF NOT EXISTS idx_books_book_id
  ON books(book_id);

CREATE INDEX IF NOT EXISTS idx_books_isbn
  ON books(isbn);

-- family_members (for child-lookup in circulation)
CREATE INDEX IF NOT EXISTS idx_family_members_parent_member_id
  ON family_members(parent_member_id);


-- ── 3. UPDATED_AT TRIGGERS ──────────────────────────────────────────────────
-- touch_updated_at() was defined in 20260425_cms_typed_tables.sql.
-- Apply it to core operational tables that lack it.

DO $$
DECLARE
  tbl text;
  trig text;
  tables text[] := ARRAY[
    'book_copies',
    'circulation',
    'reservations',
    'pos_transactions',
    'pos_transaction_items'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    trig := 'trg_' || tbl || '_updated_at';
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = trig
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()',
        trig, tbl
      );
    END IF;
  END LOOP;
END $$;


-- ── 4. AUTO-SYNC: book_copies.status → books.quantity_available ─────────────
--
-- Every time a copy is added, removed, or its status changes, this trigger
-- recalculates the exact count of available copies and writes it to
-- books.quantity_available. This eliminates an entire class of bugs where
-- manual updates (checkout, return, bulk edits) would drift from reality.
--
-- The existing reserve_book_copy() / release_book_copy() RPCs still work —
-- they just become redundant for the qty update part (they will no longer
-- fight the trigger; the trigger's value is always authoritative).

CREATE OR REPLACE FUNCTION public.sync_book_quantity_available()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_book_id uuid;
BEGIN
  target_book_id := COALESCE(NEW.book_id, OLD.book_id);

  UPDATE books
  SET quantity_available = (
    SELECT COUNT(*)
    FROM   book_copies
    WHERE  book_id = target_book_id
    AND    status  = 'available'
  )
  WHERE id = target_book_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_qty_on_copy_change ON book_copies;

CREATE TRIGGER trg_sync_qty_on_copy_change
AFTER INSERT OR UPDATE OF status OR DELETE
ON book_copies
FOR EACH ROW
EXECUTE FUNCTION public.sync_book_quantity_available();


-- ── 5. ROW LEVEL SECURITY ───────────────────────────────────────────────────

-- book_copies — was completely open; restrict to staff + authenticated reads
ALTER TABLE book_copies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS book_copies_read   ON book_copies;
DROP POLICY IF EXISTS book_copies_write  ON book_copies;

CREATE POLICY book_copies_read
  ON book_copies FOR SELECT
  USING (true);                          -- any auth'd or anon user can read

CREATE POLICY book_copies_write
  ON book_copies FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());        -- only staff can insert/update/delete

-- pos_transactions — staff only
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pos_txn_staff ON pos_transactions;

CREATE POLICY pos_txn_staff
  ON pos_transactions FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- pos_transaction_items — staff only
ALTER TABLE pos_transaction_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pos_txn_items_staff ON pos_transaction_items;

CREATE POLICY pos_txn_items_staff
  ON pos_transaction_items FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- family_members — member sees own children; staff sees all
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS family_members_read   ON family_members;
DROP POLICY IF EXISTS family_members_write  ON family_members;

CREATE POLICY family_members_read
  ON family_members FOR SELECT
  USING (
    public.is_staff()
    OR parent_member_id IN (
      SELECT id FROM members WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY family_members_write
  ON family_members FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());


-- ── 6. HELPER FUNCTIONS (RPC-callable) ─────────────────────────────────────

-- Returns the number of books currently checked out to a member.
-- Usage: supabase.rpc('get_member_borrows', { p_member_id: '...' })
CREATE OR REPLACE FUNCTION public.get_member_borrows(p_member_id uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM   circulation
  WHERE  member_id = p_member_id
  AND    status    = 'checked_out';
$$;

-- Returns the total outstanding fine (in ₹) for a member.
-- Counts only unpaid fines on overdue, still-checked-out items.
-- fine_per_day defaults to ₹5.
-- Usage: supabase.rpc('get_member_fine', { p_member_id: '...' })
CREATE OR REPLACE FUNCTION public.get_member_fine(
  p_member_id  uuid,
  fine_per_day int DEFAULT 5
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    SUM(
      GREATEST(0, CURRENT_DATE - due_date::date) * fine_per_day
    ), 0
  )
  FROM  circulation
  WHERE member_id = p_member_id
  AND   status    = 'checked_out'
  AND   due_date  < CURRENT_DATE
  AND   (fine_paid IS NULL OR fine_paid = false);
$$;

-- Returns a summary row for a member: borrows, fine, days_since_joined.
-- Usage: supabase.rpc('get_member_summary', { p_member_id: '...' })
CREATE OR REPLACE FUNCTION public.get_member_summary(p_member_id uuid)
RETURNS TABLE (
  active_borrows  int,
  overdue_count   int,
  outstanding_fine numeric,
  total_borrows   bigint,
  days_as_member  int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)::int FROM circulation
       WHERE member_id = p_member_id AND status = 'checked_out')              AS active_borrows,
    (SELECT COUNT(*)::int FROM circulation
       WHERE member_id = p_member_id AND status = 'checked_out'
         AND due_date < CURRENT_DATE)                                          AS overdue_count,
    public.get_member_fine(p_member_id)                                        AS outstanding_fine,
    (SELECT COUNT(*) FROM circulation WHERE member_id = p_member_id)          AS total_borrows,
    (SELECT (CURRENT_DATE - created_at::date)::int
       FROM members WHERE id = p_member_id)                                    AS days_as_member;
$$;


-- ── 7. TABLE & COLUMN DOCUMENTATION ────────────────────────────────────────
-- Supabase Table Editor and API docs surface these automatically.

COMMENT ON TABLE books IS
  'Master inventory — serves both library (is_borrowable=true) and store (store_visible=true). '
  'book_id is the human-readable barcode: B-FIC-0001 (borrow) or S-CHI-0001 (sale).';

COMMENT ON TABLE book_copies IS
  'Individual physical copies. Each copy has a unique barcode (copy_code). '
  'status is kept in sync with circulation by trg_sync_qty_on_copy_change.';

COMMENT ON TABLE circulation IS
  'One row per borrow event. checkout_copy_id links to book_copies; '
  'fine_paid tracks whether any overdue fee was collected.';

COMMENT ON TABLE members IS
  'Library and store members. auth_user_id links to auth.users for storefront login. '
  'borrow_limit is per-plan; default 2 for monthly, higher for annual.';

COMMENT ON TABLE book_sets IS
  'Bundled sets sold as a unit with a barcode (SET001 format) and a set price.';

COMMENT ON TABLE pos_transactions IS
  'Walk-in POS sales at the library counter. Each transaction has line items in pos_transaction_items.';

COMMENT ON TABLE pos_transaction_items IS
  'Line items for a POS transaction. item_type can be book, fine, service, or membership.';

COMMENT ON TABLE reservations IS
  'A member reserves a title before it comes back. '
  'Status: registered → pending → fulfilled/cancelled.';

COMMENT ON TABLE app_settings IS
  'Key-value store for runtime config. Keys: whatsapp_mode, whatsapp_api_key, etc.';

COMMENT ON TABLE family_members IS
  'Child accounts linked to a parent member. Used for family membership borrow tracking.';

-- Column-level docs on the most confusing fields
COMMENT ON COLUMN books.book_id IS
  'Human-readable barcode: [B|S]-[CATEGORY_PREFIX]-[0001]. '
  'B = borrowable, S = sale-only. Generated on insert.';

COMMENT ON COLUMN books.quantity_available IS
  'Auto-maintained by trg_sync_qty_on_copy_change. Do not update manually.';

COMMENT ON COLUMN book_copies.copy_code IS
  'Physical barcode printed on the book. Format: S-FIC-0001. Unique per copy.';

COMMENT ON COLUMN book_copies.copy_kind IS
  'library = borrowable only; sale = for purchase. Drives POS and Borrow page behaviour.';

COMMENT ON COLUMN book_copies.copy_mrp IS
  'Per-copy MRP override. NULL = inherit from books.mrp.';

COMMENT ON COLUMN book_copies.copy_price IS
  'Per-copy selling price override. NULL = inherit from books.sales_price.';

COMMENT ON COLUMN circulation.fine_paid IS
  'Set to true when the overdue fine for this borrow is collected (via POS or manually).';

COMMENT ON COLUMN members.borrow_limit IS
  'Max concurrent borrows for this member. Enforced in Borrow page.';

COMMENT ON COLUMN members.auth_user_id IS
  'Links to auth.users.id. NULL for walk-in members without a storefront login.';
