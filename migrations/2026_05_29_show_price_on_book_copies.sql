-- Per-copy toggle: when false, the price block is omitted from the
-- printed barcode label. Default true so existing copies print prices
-- as they always have.

ALTER TABLE book_copies
  ADD COLUMN IF NOT EXISTS show_price BOOLEAN DEFAULT true;

-- Backfill any existing NULLs (should be none since DEFAULT true, but
-- safe in case the column was added some other way first).
UPDATE book_copies SET show_price = true WHERE show_price IS NULL;
