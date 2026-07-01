-- ════════════════════════════════════════════════════════════════════════════
-- TAPAS LIBRARY — Critical fixes
-- 2026-06-30
--
--   Fix 1: Book ID race condition — atomic DB-side generation
--   Fix 2: reserve_book_copy locks a real copy row (was fighting sync trigger)
--   Fix 3: RLS on open tables (app_settings, promo_codes, transactions, sales)
--   Fix 4: is_staff() NULL-safety — NULL is_active now means NOT active
--   Fix 5: Double-checkout prevention — unique partial index on circulation
-- ════════════════════════════════════════════════════════════════════════════


-- ── Fix 1: Atomic book ID generation ─────────────────────────────────────
-- The old approach: JS reads MAX(book_id), increments, retries 50× on
-- duplicate key. Under concurrent inserts both reads return the same max →
-- both try the same next ID → one always errors.
--
-- New approach: one DB function uses ON CONFLICT DO UPDATE to atomically
-- claim the next sequence number. No retry loop needed in JS.

CREATE TABLE IF NOT EXISTS public.book_id_sequences (
  prefix   text PRIMARY KEY,
  last_num int  NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.book_id_sequences IS
  'Per-prefix counters for book ID generation. Rows are upserted atomically '
  'by next_book_id() — never update manually.';

-- Seed from books that already exist so the sequence starts above the current max
INSERT INTO public.book_id_sequences (prefix, last_num)
SELECT
  regexp_replace(book_id, '-\d+$', '')                                      AS prefix,
  MAX(CAST(regexp_replace(book_id, '^[^-]+-[^-]+-(\d+)$', '\1') AS int))   AS last_num
FROM  public.books
WHERE book_id ~ '^[BS]-[A-Z]+-\d{4}$'
GROUP BY 1
ON CONFLICT (prefix) DO UPDATE
  SET last_num = GREATEST(book_id_sequences.last_num, EXCLUDED.last_num);

CREATE OR REPLACE FUNCTION public.next_book_id(p_prefix text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_num int;
BEGIN
  INSERT INTO public.book_id_sequences (prefix, last_num)
  VALUES (p_prefix, 1)
  ON CONFLICT (prefix) DO UPDATE
    SET last_num = book_id_sequences.last_num + 1
  RETURNING last_num INTO v_num;

  RETURN p_prefix || '-' || LPAD(v_num::text, 4, '0');
END;
$$;

COMMENT ON FUNCTION public.next_book_id(text) IS
  'Atomically claims the next ID for a given prefix (e.g. "B-FIC"). '
  'Returns e.g. "B-FIC-0042". Thread-safe — replaces the read-max/retry '
  'loop in Books.js. Concurrent calls never collide.';

GRANT EXECUTE ON FUNCTION public.next_book_id(text) TO authenticated;


-- ── Fix 2: reserve_book_copy — lock a real copy row ──────────────────────
-- The old version decremented books.quantity_available directly on the books
-- table. The sync trigger added in 20260628 recalculates that field from
-- book_copies.status whenever ANY copy changes — silently overwriting the
-- reservation. A borrow or return anywhere in the system would restore the
-- count as if the reservation never happened.
--
-- Fix: change one book_copies row to status='reserved'. The sync trigger
-- then decrements books.quantity_available automatically and correctly.
-- Uses SELECT FOR UPDATE SKIP LOCKED so concurrent callers never block.

-- Step A: add 'reserved' to allowed statuses
DO $$
DECLARE cname text;
BEGIN
  SELECT constraint_name INTO cname
  FROM   information_schema.table_constraints
  WHERE  table_name      = 'book_copies'
  AND    constraint_type = 'CHECK'
  AND    constraint_name ILIKE '%status%'
  LIMIT  1;
  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.book_copies DROP CONSTRAINT ' || quote_ident(cname);
  END IF;
END $$;

ALTER TABLE public.book_copies
  ADD CONSTRAINT chk_book_copies_status
    CHECK (status IN ('available','reserved','issued','sold','lost','damaged'));

-- Step B: rewrite reserve_book_copy
CREATE OR REPLACE FUNCTION public.reserve_book_copy(
  p_book_id uuid,
  p_qty     int DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_copy_id uuid;
BEGIN
  IF p_qty <= 0 THEN
    RAISE EXCEPTION 'reserve_book_copy: qty must be positive (got %)', p_qty;
  END IF;

  -- Claim one available copy without blocking other concurrent reservations
  SELECT id INTO v_copy_id
  FROM   public.book_copies
  WHERE  book_id = p_book_id
  AND    status  = 'available'
  LIMIT  1
  FOR UPDATE SKIP LOCKED;

  IF v_copy_id IS NULL THEN
    RETURN NULL;  -- out of stock; caller should abort the order
  END IF;

  -- trg_sync_qty_on_copy_change fires here and updates books.quantity_available
  UPDATE public.book_copies
  SET    status = 'reserved'
  WHERE  id = v_copy_id;

  RETURN v_copy_id;
END;
$$;

COMMENT ON FUNCTION public.reserve_book_copy(uuid, int) IS
  'Atomically marks one available book_copies row as reserved. '
  'Returns the copy id on success, NULL if sold out. '
  'books.quantity_available is updated automatically by the sync trigger.';

-- Step C: rewrite release_book_copy (called on order cancellation)
CREATE OR REPLACE FUNCTION public.release_book_copy(
  p_book_id uuid,
  p_qty     int DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_copy_id uuid;
BEGIN
  IF p_qty <= 0 THEN
    RAISE EXCEPTION 'release_book_copy: qty must be positive (got %)', p_qty;
  END IF;

  UPDATE public.book_copies
  SET    status = 'available'
  WHERE  id = (
    SELECT id
    FROM   public.book_copies
    WHERE  book_id = p_book_id
    AND    status  = 'reserved'
    ORDER  BY created_at
    LIMIT  1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id INTO v_copy_id;

  RETURN v_copy_id;
END;
$$;

COMMENT ON FUNCTION public.release_book_copy(uuid, int) IS
  'Reverts one reserved copy back to available (used on cancellation/expiry). '
  'books.quantity_available is updated automatically by the sync trigger.';


-- ── Fix 3: RLS on tables that were fully open ─────────────────────────────

-- app_settings holds WhatsApp API keys, fine rates, borrow limits —
-- readable by any storefront customer without this policy.
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_settings_staff ON public.app_settings;
CREATE POLICY app_settings_staff
  ON public.app_settings FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- promo_codes (walk-in codes, managed in MarketingHub)
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS promo_codes_staff ON public.promo_codes;
CREATE POLICY promo_codes_staff
  ON public.promo_codes FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- promo_code_uses — redemption audit log
ALTER TABLE public.promo_code_uses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS promo_uses_staff ON public.promo_code_uses;
CREATE POLICY promo_uses_staff
  ON public.promo_code_uses FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- transactions — legacy payment history
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS transactions_staff ON public.transactions;
CREATE POLICY transactions_staff
  ON public.transactions FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- sales — legacy walk-in sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sales_staff ON public.sales;
CREATE POLICY sales_staff
  ON public.sales FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());


-- ── Fix 4: is_staff() — NULL is_active should mean NOT active ────────────
-- v2 used COALESCE(is_active, true) which treated a NULL is_active as
-- "active staff". If a staff member was removed by setting is_active to NULL
-- rather than false, they kept full write access to the entire system.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.staff s
    WHERE  s.email     = auth.email()
    AND    s.is_active = true
  );
$$;

COMMENT ON FUNCTION public.is_staff() IS
  'Returns true when the caller''s email is in staff with is_active = true. '
  'NULL is_active is treated as inactive (v3). Used in all write RLS policies.';


-- ── Fix 5: Prevent same member borrowing the same book twice at once ───────
-- Prevents duplicate active circulation rows for the same member+book pair.
CREATE UNIQUE INDEX IF NOT EXISTS idx_circulation_one_active_per_member_book
  ON public.circulation(member_id, book_id)
  WHERE status = 'checked_out';
